import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { ConfigService } from '../config/config.service';
import type {
  AiParseResult,
  FilterCondition,
  ConditionField,
  ConditionOperator,
} from '@shared/api.interface';
import type { AiStockScreenParserOutput } from '@shared/plugin-types';

@Injectable()
export class AiParseService {
  private readonly logger = new Logger(AiParseService.name);

  constructor(
    private readonly capabilityService: CapabilityService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 将自然语言选股意图解析为结构化条件
   * 如果 AI 解析服务未配置，抛出 ServiceUnavailableException
   */
  async parseIntent(query: string): Promise<AiParseResult> {
    const instanceId = this.configService.getAiParseInstanceId();
    if (!instanceId) {
      this.logger.warn('AI解析服务未配置，AI_PARSE_INSTANCE_ID 环境变量为空');
      throw new ServiceUnavailableException('AI解析服务未配置');
    }

    if (!query || query.trim().length === 0) {
      return {
        conditions: [],
        clarification: '',
        assumptions: [],
        pool: {
          code: '000300.SH',
          name: '沪深300',
          source: '默认',
        },
      };
    }

    try {
      const rawResult = await this.capabilityService.load(instanceId).call(
        'textToJson',
        { user_query: query },
      );
      const result = rawResult as AiStockScreenParserOutput;

      const validFields: ConditionField[] = [
        'pe_ttm', 'pb_mrq', 'ps_ttm', 'pcf_ttm',
        'revenue_yoy', 'profit_yoy', 'net_profit_yoy', 'roe_deduct',
        'price_change_ratio', 'volatility_20d', 'turnover_rate',
      ];
      const validOps: ConditionOperator[] = ['gt', 'gte', 'lt', 'lte', 'eq', 'between'];

      const rawConditions = Array.isArray(result.conditions) ? result.conditions : [];
      const conditions: FilterCondition[] = rawConditions.map(
        (c: unknown, index: number): FilterCondition => {
          const item = c as { [key: string]: unknown };
          const rawField = String(item.field ?? '');
          const field = validFields.includes(rawField as ConditionField)
            ? (rawField as ConditionField)
            : 'pe_ttm';
          const rawOp = String(item.operator ?? 'gte');
          const operator = validOps.includes(rawOp as ConditionOperator)
            ? (rawOp as ConditionOperator)
            : 'gte';
          const rawValue = item.value;
          let value: number | [number, number];
          if (Array.isArray(rawValue) && rawValue.length === 2) {
            value = [Number(rawValue[0]), Number(rawValue[1])];
          } else {
            value = Number(rawValue) || 0;
          }
          return {
            id: String(item.id ?? `cond_${index}`),
            field,
            fieldLabel: String(item.fieldLabel ?? field),
            operator,
            value,
            unit: item.unit !== undefined ? String(item.unit) : undefined,
            window: item.window !== undefined ? String(item.window) : undefined,
            dataSource: String(item.dataSource ?? 'AI生成'),
            confirmed: false,
            description: item.description !== undefined ? String(item.description) : undefined,
          };
        },
      );

      const assumptions = Array.isArray(result.assumptions)
        ? (result.assumptions as unknown[]).map((a: unknown) => String(a))
        : [];

      return {
        conditions,
        clarification: result.clarification ?? '',
        assumptions,
        pool: {
          code: result.pool_code ?? '000300.SH',
          name: result.pool_name ?? '沪深300',
          source: result.pool_source ?? '默认',
        },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('AI意图解析调用失败', err.message);
      throw new ServiceUnavailableException(
        `AI解析服务调用失败: ${err.message ?? '未知错误'}`,
      );
    }
  }
}
