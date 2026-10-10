import type { ConditionField, ConditionOperator } from '@shared/api.interface';

export interface FieldOption {
  value: ConditionField;
  label: string;
  unit: string;
  dataSource: string;
  window?: string;
  category: '估值' | '财务' | '行情' | '波动率';
}

export const FIELD_OPTIONS: FieldOption[] = [
  { value: 'pe_ttm', label: 'PE(TTM)', unit: '倍', dataSource: '扶摇-估值', window: 'ttm', category: '估值' },
  { value: 'pb_mrq', label: 'PB(MRQ)', unit: '倍', dataSource: '扶摇-估值', window: 'mrq', category: '估值' },
  { value: 'ps_ttm', label: 'PS(TTM)', unit: '倍', dataSource: '扶摇-估值', window: 'ttm', category: '估值' },
  { value: 'pcf_ttm', label: 'PCF(TTM)', unit: '倍', dataSource: '扶摇-估值', window: 'ttm', category: '估值' },
  { value: 'revenue_yoy', label: '营收同比增速', unit: '%', dataSource: '扶摇-财务', category: '财务' },
  { value: 'profit_yoy', label: '营业利润同比增速', unit: '%', dataSource: '扶摇-财务', category: '财务' },
  { value: 'net_profit_yoy', label: '归母净利润同比增速', unit: '%', dataSource: '扶摇-财务', category: '财务' },
  { value: 'roe_deduct', label: '扣非ROE', unit: '%', dataSource: '扶摇-财务', category: '财务' },
  { value: 'price_change_ratio', label: '涨跌幅', unit: '%', dataSource: '扶摇-行情', category: '行情' },
  { value: 'volatility_20d', label: '20日波动率', unit: '%', dataSource: '计算-波动率', window: '20d', category: '波动率' },
  { value: 'turnover_rate', label: '换手率', unit: '%', dataSource: '扶摇-行情', category: '行情' },
];

export const OPERATOR_OPTIONS: { value: ConditionOperator; label: string; symbol: string }[] = [
  { value: 'gt', label: '大于', symbol: '>' },
  { value: 'gte', label: '大于等于', symbol: '≥' },
  { value: 'lt', label: '小于', symbol: '<' },
  { value: 'lte', label: '小于等于', symbol: '≤' },
  { value: 'eq', label: '等于', symbol: '=' },
  { value: 'between', label: '介于', symbol: '~' },
];

export const OPERATOR_SYMBOL_MAP: Record<ConditionOperator, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '=',
  between: '~',
};

export const SAMPLE_QUERIES = [
  '经营改善、估值合理、走势相对稳定',
  '低估值高股息的蓝筹股',
  '业绩高速增长，估值不要太贵',
  '近期波动小，盈利质量好',
];

export const DEFAULT_POOL = {
  code: 'hs300',
  name: '沪深300成分股',
  source: '扶摇-指数成分',
};
