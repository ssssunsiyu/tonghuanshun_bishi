import { Injectable, Logger, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../config/config.service';
import type {
  StockBasic,
  StockValuation,
  StockPrice,
  StockFinancial,
} from '@shared/api.interface';

interface FuyaoResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

interface FuyaoListEnvelope<T> {
  item: T[];
  total?: number;
  timestamp?: string;
}

interface FuyaoFinancialIndicator {
  index_id: string;
  value: string | number | null;
}

interface FuyaoFinancialAbility {
  ability: string;
  indicators: FuyaoFinancialIndicator[];
}

interface FuyaoFinancialRaw {
  thscode: string;
  report: string;
  abilities: FuyaoFinancialAbility[];
}

interface FuyaoIndexConstituentRaw {
  thscode: string;
  ticker: string;
  name: string;
}

interface FuyaoValuationRaw {
  thscode: string;
  name: string;
  pe_ttm: number | null;
  pe_mrq: number | null;
  pb_mrq: number | null;
  ps_ttm: number | null;
  pcf_ttm: number | null;
}

interface FuyaoPriceRaw {
  thscode: string;
  ticker: string;
  last_price: number | null;
  price_change_ratio_pct: number | null;
  prev_price: number | null;
  high_price: number | null;
  low_price: number | null;
  open_price: number | null;
  volume: number | null;
  turnover: number | null;
}



interface FuyaoHistoricalKline {
  date_ms: number;
  close_price: number | null;
}

const BATCH_SIZE = 100;

@Injectable()
export class FuyaoDataService {
  private readonly logger = new Logger(FuyaoDataService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get apiKey(): string {
    const key = this.configService.getFuyaoApiKey();
    if (!key) {
      throw new ServiceUnavailableException('扶摇 API Key 未配置，请先在配置页设置');
    }
    return key;
  }

  private async request<T>(path: string, params: Record<string, string | number>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<FuyaoResponse<T>>(path, {
          params,
          headers: {
            'X-api-key': this.apiKey,
          },
        }),
      );
      const body = response.data;
      if (body.code !== 0) {
        this.logger.error(`扶摇 API 业务错误: ${path}, code=${body.code}, msg=${body.msg ?? ''}`);
        throw new BadGatewayException(`扶摇数据服务错误: ${body.msg ?? `code=${body.code}`}`);
      }
      return body.data;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      const err = error as { message?: string; response?: { status?: number; data?: unknown } };
      this.logger.error(`扶摇 API 调用失败: ${path}, ${err.message ?? String(error)}`);
      if (err.response?.status) {
        throw new BadGatewayException(
          `扶摇数据服务不可用 (HTTP ${err.response.status})`,
        );
      }
      throw new BadGatewayException(`扶摇数据服务调用失败: ${err.message ?? '未知错误'}`);
    }
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private findIndicator(
    abilities: FuyaoFinancialAbility[],
    indexId: string,
  ): string | number | null {
    for (const ab of abilities) {
      const found = ab.indicators.find((i: FuyaoFinancialIndicator) => i.index_id === indexId);
      if (found) return found.value;
    }
    return null;
  }

  /**
   * 获取指数成分股列表
   */
  async getIndexConstituents(thscode: string): Promise<StockBasic[]> {
    const data = await this.request<FuyaoListEnvelope<FuyaoIndexConstituentRaw>>(
      '/api/a-share-index/constituents/ths-stock-list',
      { thscode },
    );
    return data.item.map((item: FuyaoIndexConstituentRaw) => ({
      thscode: item.thscode,
      ticker: item.ticker,
      name: item.name,
    }));
  }

  /**
   * 批量获取行情快照，自动分批（每批100个）
   */
  async getPriceSnapshot(thscodes: string[]): Promise<StockPrice[]> {
    if (thscodes.length === 0) return [];
    const batches: string[][] = [];
    for (let i = 0; i < thscodes.length; i += BATCH_SIZE) {
      batches.push(thscodes.slice(i, i + BATCH_SIZE));
    }
    const results: StockPrice[] = [];
    for (const batch of batches) {
      const data = await this.request<FuyaoListEnvelope<FuyaoPriceRaw>>(
        '/api/a-share/prices/snapshot',
        { thscodes: batch.join(',') },
      );
      for (const item of data.item) {
        results.push({
          thscode: item.thscode,
          ticker: item.ticker,
          lastPrice: item.last_price,
          priceChangeRatioPct: item.price_change_ratio_pct,
          prevPrice: item.prev_price,
          highPrice: item.high_price,
          lowPrice: item.low_price,
          openPrice: item.open_price,
          volume: item.volume,
          turnover: item.turnover,
        });
      }
    }
    return results;
  }

  /**
   * 批量获取估值快照，自动分批（每批100个）
   */
  async getValuationSnapshot(thscodes: string[]): Promise<StockValuation[]> {
    if (thscodes.length === 0) return [];
    const batches: string[][] = [];
    for (let i = 0; i < thscodes.length; i += BATCH_SIZE) {
      batches.push(thscodes.slice(i, i + BATCH_SIZE));
    }
    const results: StockValuation[] = [];
    for (const batch of batches) {
      const data = await this.request<FuyaoListEnvelope<FuyaoValuationRaw>>(
        '/api/a-share/valuations/snapshot',
        { thscodes: batch.join(',') },
      );
      for (const item of data.item) {
        results.push({
          thscode: item.thscode,
          name: item.name,
          peTtm: item.pe_ttm,
          peMrq: item.pe_mrq,
          pbMrq: item.pb_mrq,
          psTtm: item.ps_ttm,
          pcfTtm: item.pcf_ttm,
        });
      }
    }
    return results;
  }

  /**
   * 获取单只股票财务指标
   * 扶摇财务接口返回 abilities 分组，每组内含 indicators: [{index_id, value}]
   */
  async getFinancialIndicators(thscode: string, report: string): Promise<StockFinancial> {
    const data = await this.request<FuyaoFinancialRaw>(
      '/api/a-share/financials/indicators',
      { thscode, report },
    );
    const ind = (id: string) => this.toNumber(this.findIndicator(data.abilities, id));
    return {
      thscode: data.thscode,
      reportPeriod: data.report,
      revenueYoy: ind('calculate_operating_income_yoy_growth_ratio'),
      operatingProfitYoy: ind('calculate_operating_profit_yoy_growth_ratio'),
      netProfitYoy: ind('calculate_parent_holder_net_profit_yoy_growth_ratio'),
      roeDeduct: ind('index_deduct_weighted_avg_roe'),
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取历史K线数据（用于波动率计算）
   * 返回按日期升序排列的收盘价数组
   */
  async getHistoricalPrices(
    thscode: string,
    startMs: number,
    endMs: number,
    interval: string = '1d',
  ): Promise<Array<{ dateMs: number; close: number | null }>> {
    const data = await this.request<FuyaoListEnvelope<FuyaoHistoricalKline>>(
      '/api/a-share/prices/historical',
      {
        thscode,
        interval,
        start: String(startMs),
        end: String(endMs),
        adjust: 'forward',
      },
    );
    return data.item.map((item: FuyaoHistoricalKline) => ({
      dateMs: item.date_ms,
      close: item.close_price,
    }));
  }
}
