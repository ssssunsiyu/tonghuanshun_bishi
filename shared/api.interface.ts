/* 前后端共享类型定义 - 金融智能选股产品 */

export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';

export type ConditionField =
  | 'pe_ttm'
  | 'pb_mrq'
  | 'ps_ttm'
  | 'pcf_ttm'
  | 'revenue_yoy'
  | 'profit_yoy'
  | 'net_profit_yoy'
  | 'roe_deduct'
  | 'price_change_ratio'
  | 'volatility_20d'
  | 'turnover_rate';

export interface FilterCondition {
  id: string;
  field: ConditionField;
  fieldLabel: string;
  operator: ConditionOperator;
  value: number | [number, number];
  unit?: string;
  window?: string;
  dataSource: string;
  confirmed: boolean;
  description?: string;
}

export interface ConflictInfo {
  type: 'logical_conflict' | 'zero_result_risk' | 'missing_data';
  severity: 'error' | 'warning';
  message: string;
  conditionIds: string[];
}

export interface AiParseResult {
  conditions: FilterCondition[];
  clarification: string;
  assumptions: string[];
  pool: {
    code: string;
    name: string;
    source: string;
  };
}

export interface StockBasic {
  thscode: string;
  ticker: string;
  name: string;
}

export interface StockValuation {
  thscode: string;
  name: string;
  peTtm: number | null;
  peMrq: number | null;
  pbMrq: number | null;
  psTtm: number | null;
  pcfTtm: number | null;
}

export interface StockPrice {
  thscode: string;
  ticker: string;
  lastPrice: number | null;
  priceChangeRatioPct: number | null;
  prevPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  openPrice: number | null;
  volume: number | null;
  turnover: number | null;
}

export interface StockFinancial {
  thscode: string;
  reportPeriod: string;
  revenueYoy: number | null;
  operatingProfitYoy: number | null;
  netProfitYoy: number | null;
  roeDeduct: number | null;
  fetchedAt: string;
}

export interface StockVolatility {
  thscode: string;
  volatility20d: number | null;
  dataPoints: number;
  windowDays: number;
  gapReason?: string;
}

export interface StockWithMetrics extends StockBasic {
  valuation: StockValuation | null;
  price: StockPrice | null;
  financial: StockFinancial | null;
  volatility: StockVolatility | null;
}

export type ScreenStatus = 'included' | 'excluded' | 'unknown';

export interface ConditionResult {
  conditionId: string;
  field: ConditionField;
  fieldLabel: string;
  operator: ConditionOperator;
  threshold: number | [number, number];
  actualValue: number | null;
  status: ScreenStatus;
  reason: string;
  unit?: string;
}

export interface ScreenedStock extends StockBasic {
  overallStatus: ScreenStatus;
  conditionResults: ConditionResult[];
  includedCount: number;
  excludedCount: number;
  unknownCount: number;
}

export interface ScreenResult {
  totalPool: number;
  included: number;
  excluded: number;
  unknown: number;
  stocks: ScreenedStock[];
  snapshotId: string;
  dataSnapshot: {
    poolCode: string;
    poolName: string;
    poolCount: number;
    priceTimestamp: number | null;
    valuationTimestamp: number | null;
    financialReportPeriod: string | null;
    volatilityWindow: string | null;
    fetchedAt: string;
  };
}

export interface ScreenDiff {
  added: ScreenedStock[];
  removed: ScreenedStock[];
  unchanged: ScreenedStock[];
  changedDetail: {
    thscode: string;
    name: string;
    changeType: 'added' | 'removed';
    changedConditions: Array<{
      conditionId: string;
      fieldLabel: string;
      oldStatus: ScreenStatus;
      newStatus: ScreenStatus;
    }>;
  }[];
  snapshotId: string;
  snapshotReused: boolean;
  currentResult: ScreenResult;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  conditions: FilterCondition[];
  poolCode: string;
  poolName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataConfigStatus {
  fuyaoConfigured: boolean;
  aiConfigured: boolean;
  fuyaoKeyEnv: string;
  aiEnv: string;
  fuyaoKeySource: 'env' | 'devfile' | 'none';
  lastChecked?: string;
}

export interface CompareItem {
  stock: StockWithMetrics;
  screenResult?: ScreenedStock;
}
