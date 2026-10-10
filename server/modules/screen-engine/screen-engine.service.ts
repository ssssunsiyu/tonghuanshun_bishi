import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FuyaoDataService } from '../fuyao-data/fuyao-data.service';
import { AiParseService } from '../ai-parse/ai-parse.service';
import { calculateVolatility20d } from './utils/volatility';
import { aggregateConditionResults } from './utils/aggregation';
import type {
  FilterCondition,
  ConflictInfo,
  ScreenResult,
  ScreenedStock,
  ConditionResult,
  ScreenStatus,
  StockBasic,
  StockValuation,
  StockPrice,
  StockFinancial,
  StockVolatility,
  AiParseResult,
  ScreenDiff,
  ConditionOperator,
  ConditionField,
} from '@shared/api.interface';

const DEFAULT_POOL = { code: '000300.SH', name: '沪深300' };
const VOLATILITY_WINDOW_DAYS = 20;
const TRADING_DAYS_PER_YEAR = 252;
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

// 字段白名单到数据源的映射
const FIELD_DATA_SOURCE: Record<ConditionField, string> = {
  pe_ttm: 'valuation',
  pb_mrq: 'valuation',
  ps_ttm: 'valuation',
  pcf_ttm: 'valuation',
  revenue_yoy: 'financial',
  profit_yoy: 'financial',
  net_profit_yoy: 'financial',
  roe_deduct: 'financial',
  price_change_ratio: 'price',
  volatility_20d: 'calculated',
  turnover_rate: 'price',
};

// 哪些字段需要批量获取财务数据（每股单独获取，成本较高，按需）
const FINANCIAL_FIELDS: ConditionField[] = [
  'revenue_yoy',
  'profit_yoy',
  'net_profit_yoy',
  'roe_deduct',
];

interface ValidateScreenResult {
  conflicts: ConflictInfo[];
  valid: boolean;
}

interface SnapshotData {
  id: string;
  poolCode: string;
  poolName: string;
  constituents: StockBasic[];
  valuationMap: Map<string, StockValuation>;
  priceMap: Map<string, StockPrice>;
  financialMap: Map<string, StockFinancial>;
  volatilityMap: Map<string, StockVolatility>;
  financialReportPeriod: string | null;
  fetchedAt: string;
  createdAt: number;
  usedFields: Set<ConditionField>;
}

interface FetchPlan {
  needValuation: boolean;
  needPrice: boolean;
  needFinancial: boolean;
  needVolatility: boolean;
}

@Injectable()
export class ScreenEngineService {
  private readonly logger = new Logger(ScreenEngineService.name);
  private readonly snapshotCache = new Map<string, SnapshotData>();

  constructor(
    private readonly fuyaoDataService: FuyaoDataService,
    private readonly aiParseService: AiParseService,
  ) {}

  /**
   * AI 解析自然语言意图
   */
  async parseIntent(query: string): Promise<AiParseResult> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('查询内容不能为空');
    }
    return this.aiParseService.parseIntent(query);
  }

  /**
   * 校验条件、检测冲突
   */
  validateConditions(conditions: FilterCondition[]): ValidateScreenResult {
    const conflicts: ConflictInfo[] = [];

    if (!conditions || conditions.length === 0) {
      return { conflicts, valid: true };
    }

    // 按字段分组
    const byField = new Map<ConditionField, FilterCondition[]>();
    for (const cond of conditions) {
      const existing = byField.get(cond.field) ?? [];
      byField.set(cond.field, [...existing, cond]);
    }

    // 检测同一字段的逻辑冲突
    for (const [field, conds] of byField) {
      if (conds.length < 2) continue;

      // 提取每个条件的数值范围
      const ranges = conds.map((c: FilterCondition) => this.getConditionRange(c));

      // 检查所有范围是否有交集
      const hasIntersection = this.checkRangesIntersection(ranges);
      if (!hasIntersection) {
        conflicts.push({
          type: 'logical_conflict',
          severity: 'error',
          message: `同一字段「${conds[0].fieldLabel}」存在多个条件，数值范围无交集`,
          conditionIds: conds.map((c: FilterCondition) => c.id),
        });
      }

      // 条件过多可能零结果警告
      if (conds.length >= 3) {
        conflicts.push({
          type: 'zero_result_risk',
          severity: 'warning',
          message: `字段「${conds[0].fieldLabel}」有 ${conds.length} 个条件，可能导致筛选结果过少`,
          conditionIds: conds.map((c: FilterCondition) => c.id),
        });
      }
    }

    // 检测数据缺失风险（波动率需要K线数据，可能部分股票缺失）
    const hasVolatility = conditions.some(
      (c: FilterCondition) => c.field === 'volatility_20d',
    );
    if (hasVolatility) {
      conflicts.push({
        type: 'missing_data',
        severity: 'warning',
        message: '波动率需要基于历史K线计算，上市时间较短的股票可能数据不足',
        conditionIds: conditions
          .filter((c: FilterCondition) => c.field === 'volatility_20d')
          .map((c: FilterCondition) => c.id),
      });
    }

    // 检测财务指标数据缺失风险
    const hasFinancial = conditions.some((c: FilterCondition) =>
      FINANCIAL_FIELDS.includes(c.field),
    );
    if (hasFinancial) {
      conflicts.push({
        type: 'missing_data',
        severity: 'warning',
        message: '财务指标依赖最新报告期数据，部分公司可能尚未披露最新财报',
        conditionIds: conditions
          .filter((c: FilterCondition) => FINANCIAL_FIELDS.includes(c.field))
          .map((c: FilterCondition) => c.id),
      });
    }

    const valid = !conflicts.some((c: ConflictInfo) => c.severity === 'error');
    return { conflicts, valid };
  }

  /**
   * 获取条件的数值范围 [low, high]，null 表示无边界
   */
  private getConditionRange(cond: FilterCondition): [number | null, number | null] {
    const { operator, value } = cond;
    const v = value as number;
    const arr = value as [number, number];

    switch (operator) {
      case 'gt':
        return [v, null];
      case 'gte':
        return [v, null];
      case 'lt':
        return [null, v];
      case 'lte':
        return [null, v];
      case 'eq':
        return [v, v];
      case 'between':
        return [arr[0], arr[1]];
      default:
        return [null, null];
    }
  }

  /**
   * 检查多个数值范围是否存在交集
   */
  private checkRangesIntersection(
    ranges: Array<[number | null, number | null]>,
  ): boolean {
    if (ranges.length < 2) return true;

    // 计算交集的上下界
    let lowerBound = -Infinity;
    let upperBound = Infinity;

    for (const [low, high] of ranges) {
      if (low !== null && low > lowerBound) lowerBound = low;
      if (high !== null && high < upperBound) upperBound = high;
    }

    return lowerBound <= upperBound;
  }

  private getFetchPlan(fields: Set<ConditionField>): FetchPlan {
    const sources = new Set<string>();
    for (const field of fields) {
      sources.add(FIELD_DATA_SOURCE[field] ?? 'unknown');
    }
    return {
      needValuation: sources.has('valuation'),
      needPrice: sources.has('price'),
      needFinancial: sources.has('financial'),
      needVolatility: sources.has('calculated'),
    };
  }

  private async fetchSnapshotData(
    poolCode: string,
    poolName: string,
    plan: FetchPlan,
  ): Promise<SnapshotData> {
    const fetchedAt = new Date().toISOString();

    this.logger.log(`获取指数成分: ${poolCode}`);
    const constituents: StockBasic[] =
      await this.fuyaoDataService.getIndexConstituents(poolCode);
    const thscodes = constituents.map((s: StockBasic) => s.thscode);

    if (thscodes.length === 0) {
      throw new BadRequestException('指数成分股列表为空');
    }

    const valuationMap = new Map<string, StockValuation>();
    const priceMap = new Map<string, StockPrice>();
    const financialMap = new Map<string, StockFinancial>();
    const volatilityMap = new Map<string, StockVolatility>();
    let financialReportPeriod: string | null = null;

    if (plan.needValuation) {
      this.logger.log(`获取估值快照: ${thscodes.length} 只股票`);
      const valuations = await this.fuyaoDataService.getValuationSnapshot(thscodes);
      for (const v of valuations) valuationMap.set(v.thscode, v);
    }

    if (plan.needPrice) {
      this.logger.log(`获取行情快照: ${thscodes.length} 只股票`);
      const prices = await this.fuyaoDataService.getPriceSnapshot(thscodes);
      for (const p of prices) priceMap.set(p.thscode, p);
    }

    if (plan.needFinancial) {
      this.logger.log(`获取财务指标: ${thscodes.length} 只股票`);
      const latestReport = await this.getLatestReportPeriod();
      financialReportPeriod = latestReport;
      const batchSize = 10;
      for (let i = 0; i < thscodes.length; i += batchSize) {
        const batch = thscodes.slice(i, i + batchSize);
        const promises = batch.map((code: string) =>
          this.fuyaoDataService
            .getFinancialIndicators(code, latestReport)
            .catch((err: Error) => {
              this.logger.warn(`获取 ${code} 财务指标失败: ${err.message}`);
              return null;
            }),
        );
        const results = await Promise.all(promises);
        for (const f of results) {
          if (f) financialMap.set(f.thscode, f);
        }
      }
    }

    if (plan.needVolatility) {
      this.logger.log(`计算波动率: ${thscodes.length} 只股票`);
      const { startMs, endMs } = this.getVolatilityDateRange();

      let benchmarkKlines: Array<{ dateMs: number; close: number | null }> = [];
      try {
        benchmarkKlines = await this.fuyaoDataService.getHistoricalPrices(
          poolCode,
          startMs,
          endMs,
        );
        this.logger.log(
          `基准指数 ${poolCode} 交易日数量: ${benchmarkKlines.length}`,
        );
      } catch (err) {
        const error = err as Error;
        this.logger.warn(
          `获取基准指数 ${poolCode} K线失败，波动率连续性将不可验证: ${error.message}`,
        );
      }

      const batchSize = 10;
      for (let i = 0; i < thscodes.length; i += batchSize) {
        const batch = thscodes.slice(i, i + batchSize);
        const promises = batch.map((code: string) =>
          this.calculateVolatility(code, startMs, endMs, benchmarkKlines).catch(
            (err: Error) => {
              this.logger.warn(`计算 ${code} 波动率失败: ${err.message}`);
              return null;
            },
          ),
        );
        const results = await Promise.all(promises);
        for (const v of results) {
          if (v) volatilityMap.set(v.thscode, v);
        }
      }
    }

    const usedFields = new Set<ConditionField>();
    for (const [field, source] of Object.entries(FIELD_DATA_SOURCE)) {
      if (source === 'valuation' && plan.needValuation) usedFields.add(field as ConditionField);
      if (source === 'price' && plan.needPrice) usedFields.add(field as ConditionField);
      if (source === 'financial' && plan.needFinancial) usedFields.add(field as ConditionField);
      if (source === 'calculated' && plan.needVolatility) usedFields.add(field as ConditionField);
    }

    return {
      id: randomUUID(),
      poolCode,
      poolName,
      constituents,
      valuationMap,
      priceMap,
      financialMap,
      volatilityMap,
      financialReportPeriod,
      fetchedAt,
      createdAt: Date.now(),
      usedFields,
    };
  }

  private evaluateConditionsOnSnapshot(
    snapshot: SnapshotData,
    conditions: FilterCondition[],
  ): { stocks: ScreenedStock[]; included: number; excluded: number; unknown: number } {
    if (conditions.length === 0) {
      throw new BadRequestException('请至少添加一条筛选条件');
    }

    const screenedStocks: ScreenedStock[] = snapshot.constituents.map(
      (stock: StockBasic) => {
        const valuation = snapshot.valuationMap.get(stock.thscode) ?? null;
        const price = snapshot.priceMap.get(stock.thscode) ?? null;
        const financial = snapshot.financialMap.get(stock.thscode) ?? null;
        const volatility = snapshot.volatilityMap.get(stock.thscode) ?? null;

        const conditionResults: ConditionResult[] = conditions.map(
          (cond: FilterCondition) =>
            this.evaluateCondition(cond, { valuation, price, financial, volatility }),
        );

        const {
          overallStatus,
          includedCount,
          excludedCount,
          unknownCount,
        } = aggregateConditionResults(conditionResults);

        return {
          thscode: stock.thscode,
          ticker: stock.ticker,
          name: stock.name,
          overallStatus,
          conditionResults,
          includedCount,
          excludedCount,
          unknownCount,
        };
      },
    );

    let included = 0;
    let excluded = 0;
    let unknown = 0;
    for (const s of screenedStocks) {
      if (s.overallStatus === 'included') included += 1;
      else if (s.overallStatus === 'excluded') excluded += 1;
      else unknown += 1;
    }

    return { stocks: screenedStocks, included, excluded, unknown };
  }

  private buildScreenResult(
    snapshot: SnapshotData,
    evaluated: { stocks: ScreenedStock[]; included: number; excluded: number; unknown: number },
  ): ScreenResult {
    const plan = {
      needValuation: snapshot.valuationMap.size > 0,
      needPrice: snapshot.priceMap.size > 0,
      needFinancial: snapshot.financialMap.size > 0,
      needVolatility: snapshot.volatilityMap.size > 0,
    };
    return {
      totalPool: evaluated.stocks.length,
      included: evaluated.included,
      excluded: evaluated.excluded,
      unknown: evaluated.unknown,
      stocks: evaluated.stocks,
      snapshotId: snapshot.id,
      dataSnapshot: {
        poolCode: snapshot.poolCode,
        poolName: snapshot.poolName,
        poolCount: evaluated.stocks.length,
        priceTimestamp: plan.needPrice ? new Date(snapshot.fetchedAt).getTime() : null,
        valuationTimestamp: plan.needValuation ? new Date(snapshot.fetchedAt).getTime() : null,
        financialReportPeriod: plan.needFinancial ? snapshot.financialReportPeriod : null,
        volatilityWindow: plan.needVolatility ? `${VOLATILITY_WINDOW_DAYS}d` : null,
        fetchedAt: snapshot.fetchedAt,
      },
    };
  }

  private getSnapshot(snapshotId: string): SnapshotData | null {
    const snap = this.snapshotCache.get(snapshotId);
    if (!snap) return null;
    if (Date.now() - snap.createdAt > SNAPSHOT_TTL_MS) {
      this.snapshotCache.delete(snapshotId);
      return null;
    }
    return snap;
  }

  private saveSnapshot(snapshot: SnapshotData): void {
    this.snapshotCache.set(snapshot.id, snapshot);
    if (this.snapshotCache.size > 50) {
      const oldestKey = this.snapshotCache.keys().next().value;
      if (oldestKey) this.snapshotCache.delete(oldestKey);
    }
  }

  /**
   * 执行筛选
   */
  async runScreen(
    conditions: FilterCondition[],
    poolCode: string = DEFAULT_POOL.code,
    poolName: string = DEFAULT_POOL.name,
  ): Promise<ScreenResult> {
    if (!conditions || conditions.length === 0) {
      throw new BadRequestException('筛选条件不能为空');
    }

    const validation = this.validateConditions(conditions);
    if (!validation.valid) {
      throw new BadRequestException('条件存在逻辑冲突，请先解决冲突再执行筛选');
    }

    const fields = new Set(conditions.map((c: FilterCondition) => c.field));
    const plan = this.getFetchPlan(fields);
    const snapshot = await this.fetchSnapshotData(poolCode, poolName, plan);
    this.saveSnapshot(snapshot);

    const evaluated = this.evaluateConditionsOnSnapshot(snapshot, conditions);
    return this.buildScreenResult(snapshot, evaluated);
  }

  /**
   * 对比两组条件的筛选结果差异
   * 若提供 baseSnapshotId 且快照有效，复用该快照数据（差异完全来自条件变化）
   * 否则重新抓取一份新快照并在其上评估两组条件（差异仍来自条件，但数据时点为最新）
   */
  async runDiff(
    conditionsA: FilterCondition[],
    conditionsB: FilterCondition[],
    poolCode: string = DEFAULT_POOL.code,
    poolName: string = DEFAULT_POOL.name,
    baseSnapshotId?: string,
  ): Promise<ScreenDiff> {
    const allFields = new Set<ConditionField>();
    for (const c of conditionsA) allFields.add(c.field);
    for (const c of conditionsB) allFields.add(c.field);

    let snapshot: SnapshotData | null = null;
    let snapshotReused = false;

    if (baseSnapshotId) {
      const cached = this.getSnapshot(baseSnapshotId);
      if (cached && cached.poolCode === poolCode) {
        const allCovered = [...allFields].every((f: ConditionField) =>
          cached.usedFields.has(f),
        );
        if (allCovered) {
          snapshot = cached;
          snapshotReused = true;
          this.logger.log(`复用快照 ${baseSnapshotId.slice(0, 8)} 进行差异对比`);
        }
      }
    }

    if (!snapshot) {
      const plan = this.getFetchPlan(allFields);
      snapshot = await this.fetchSnapshotData(poolCode, poolName, plan);
      this.saveSnapshot(snapshot);
    }

    const evalA = this.evaluateConditionsOnSnapshot(snapshot, conditionsA);
    const evalB = this.evaluateConditionsOnSnapshot(snapshot, conditionsB);

    const added: ScreenedStock[] = [];
    const removed: ScreenedStock[] = [];
    const unchanged: ScreenedStock[] = [];
    const changedDetail: ScreenDiff['changedDetail'] = [];

    const mapA = new Map<string, ScreenedStock>();
    for (const s of evalA.stocks) mapA.set(s.thscode, s);

    for (const stockB of evalB.stocks) {
      const stockA = mapA.get(stockB.thscode);
      if (!stockA) continue;

      const statusA = stockA.overallStatus;
      const statusB = stockB.overallStatus;

      if (statusA === statusB && statusA === 'included') {
        unchanged.push(stockB);
      } else if (statusA !== 'included' && statusB === 'included') {
        added.push(stockB);
        changedDetail.push({
          thscode: stockB.thscode,
          name: stockB.name,
          changeType: 'added',
          changedConditions: this.findChangedConditions(stockA, stockB),
        });
      } else if (statusA === 'included' && statusB !== 'included') {
        removed.push(stockB);
        changedDetail.push({
          thscode: stockB.thscode,
          name: stockB.name,
          changeType: 'removed',
          changedConditions: this.findChangedConditions(stockA, stockB),
        });
      }
    }

    this.logger.log(
      `差异对比完成（快照${snapshotReused ? '复用' : '新取'}）：新增 ${added.length}，移除 ${removed.length}，未变 ${unchanged.length}`,
    );

    const currentResult = this.buildScreenResult(snapshot, evalB);

    return {
      added,
      removed,
      unchanged,
      changedDetail,
      snapshotId: snapshot.id,
      snapshotReused,
      currentResult,
    };
  }

  private findChangedConditions(
    a: ScreenedStock,
    b: ScreenedStock,
  ): Array<{
    conditionId: string;
    fieldLabel: string;
    oldStatus: ScreenStatus;
    newStatus: ScreenStatus;
  }> {
    const resultMapA = new Map<string, ConditionResult>();
    for (const cr of a.conditionResults) resultMapA.set(cr.conditionId, cr);
    const resultMapB = new Map<string, ConditionResult>();
    for (const cr of b.conditionResults) resultMapB.set(cr.conditionId, cr);

    const changes: Array<{
      conditionId: string;
      fieldLabel: string;
      oldStatus: ScreenStatus;
      newStatus: ScreenStatus;
    }> = [];

    for (const [id, crB] of resultMapB) {
      const crA = resultMapA.get(id);
      if (crA && crA.status !== crB.status) {
        changes.push({
          conditionId: id,
          fieldLabel: crB.fieldLabel,
          oldStatus: crA.status,
          newStatus: crB.status,
        });
      }
    }

    return changes;
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(
    cond: FilterCondition,
    data: {
      valuation: StockValuation | null;
      price: StockPrice | null;
      financial: StockFinancial | null;
      volatility: StockVolatility | null;
    },
  ): ConditionResult {
    const actualValue = this.getFieldValue(cond.field, data);

    let status: ScreenStatus;
    let reason: string;

    if (actualValue === null || actualValue === undefined) {
      status = 'unknown';
      reason = '数据缺失，无法判断';
    } else {
      status = this.compareValue(actualValue, cond.operator, cond.value)
        ? 'included'
        : 'excluded';
      reason = this.buildReason(cond, actualValue, status);
    }

    return {
      conditionId: cond.id,
      field: cond.field,
      fieldLabel: cond.fieldLabel,
      operator: cond.operator,
      threshold: cond.value,
      actualValue,
      status,
      reason,
      unit: cond.unit,
    };
  }

  /**
   * 从数据中提取字段值
   */
  private getFieldValue(
    field: ConditionField,
    data: {
      valuation: StockValuation | null;
      price: StockPrice | null;
      financial: StockFinancial | null;
      volatility: StockVolatility | null;
    },
  ): number | null {
    switch (field) {
      case 'pe_ttm':
        return data.valuation?.peTtm ?? null;
      case 'pb_mrq':
        return data.valuation?.pbMrq ?? null;
      case 'ps_ttm':
        return data.valuation?.psTtm ?? null;
      case 'pcf_ttm':
        return data.valuation?.pcfTtm ?? null;
      case 'revenue_yoy':
        return data.financial?.revenueYoy ?? null;
      case 'profit_yoy':
        return data.financial?.operatingProfitYoy ?? null;
      case 'net_profit_yoy':
        return data.financial?.netProfitYoy ?? null;
      case 'roe_deduct':
        return data.financial?.roeDeduct ?? null;
      case 'price_change_ratio':
        return data.price?.priceChangeRatioPct ?? null;
      case 'volatility_20d':
        return data.volatility?.volatility20d ?? null;
      case 'turnover_rate':
        // 扶摇行情快照目前没有换手率字段，返回 null
        return null;
      default:
        return null;
    }
  }

  /**
   * 比较数值是否满足条件
   */
  private compareValue(
    actual: number,
    operator: ConditionOperator,
    value: number | [number, number],
  ): boolean {
    switch (operator) {
      case 'gt':
        return actual > (value as number);
      case 'gte':
        return actual >= (value as number);
      case 'lt':
        return actual < (value as number);
      case 'lte':
        return actual <= (value as number);
      case 'eq':
        return actual === (value as number);
      case 'between': {
        const [low, high] = value as [number, number];
        return actual >= low && actual <= high;
      }
      default:
        return false;
    }
  }

  /**
   * 构建条件原因描述
   */
  private buildReason(
    cond: FilterCondition,
    actualValue: number,
    status: ScreenStatus,
  ): string {
    const unit = cond.unit ?? '';
    const actualStr = `${actualValue}${unit}`;
    const opLabel = this.getOperatorLabel(cond.operator);

    if (cond.operator === 'between') {
      const [low, high] = cond.value as [number, number];
      const thresholdStr = `${low}${unit} ~ ${high}${unit}`;
      return status === 'included'
        ? `实际值 ${actualStr}，在区间 ${thresholdStr} 内`
        : `实际值 ${actualStr}，不在区间 ${thresholdStr} 内`;
    }

    const thresholdStr = `${cond.value}${unit}`;
    return status === 'included'
      ? `实际值 ${actualStr}，${opLabel} ${thresholdStr}`
      : `实际值 ${actualStr}，未${opLabel} ${thresholdStr}`;
  }

  private getOperatorLabel(operator: ConditionOperator): string {
    const map: Record<ConditionOperator, string> = {
      gt: '大于',
      gte: '大于等于',
      lt: '小于',
      lte: '小于等于',
      eq: '等于',
      between: '在区间内',
    };
    return map[operator] ?? operator;
  }

  /**
   * 获取波动率计算的日期范围
   */
  private getVolatilityDateRange(): { startMs: number; endMs: number } {
    const endMs = Date.now();
    const startMs = endMs - 150 * 24 * 60 * 60 * 1000;
    return { startMs, endMs };
  }

  /**
   * 获取最新报告期（默认最近一个季度）
   */
  private getLatestReportPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 扶摇财务接口 report 参数格式：yyyy-N（N=1..4，对应 Q1..Q4/年报）
    // Q1: 4月底出 → 5-7月用Q1
    // Q2: 8月底出 → 8-10月用Q2
    // Q3: 10月底出 → 11-1月用Q3
    // 年报: 4月底出 → 2-4月用上年报

    if (month >= 5 && month <= 7) {
      return `${year}-1`;
    } else if (month >= 8 && month <= 10) {
      return `${year}-2`;
    } else if (month === 11 || month === 12) {
      return `${year}-3`;
    } else {
      // 1-4月：使用去年年报数据（假设已披露）
      return `${year - 1}-4`;
    }
  }

  /**
   * 计算单只股票的20日年化波动率
   */
  private async calculateVolatility(
    thscode: string,
    startMs: number,
    endMs: number,
    benchmarkKlines: Array<{ dateMs: number; close: number | null }>,
  ): Promise<StockVolatility> {
    const klines = await this.fuyaoDataService.getHistoricalPrices(
      thscode,
      startMs,
      endMs,
    );
    return calculateVolatility20d(thscode, klines, { benchmarkKlines });
  }
}
