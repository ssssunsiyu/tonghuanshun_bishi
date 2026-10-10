// ---- plugin:ai-stock-screen-parser ----
// ============================================================
// 插件 ai-stock-screen-parser (选股意图解析器) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiStockScreenParserInput {
  /** 用户自然语言选股查询语句 */
  user_query: string;
}

/**
 * capabilityClient.load('ai-stock-screen-parser').call<AiStockScreenParserOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { clarification, assumptions, pool_code, ... } = result;
 * 返回值形如：
 *   {"clarification":"示例文本","assumptions":[],"pool_code":"示例文本","pool_name":"示例文本","pool_source":"示例文本","conditions":[]}
 */
export interface AiStockScreenParserOutput {
  /** 对用户意图的澄清说明，无歧义时填空字符串 */
  clarification: string;
  /** AI做出的假设列表，字符串数组，无假设时空数组 */
  assumptions: unknown[];
  /** 股票池代码，默认000300.SH */
  pool_code: string;
  /** 股票池名称，默认沪深300 */
  pool_name: string;
  /** 股票池来源说明 */
  pool_source: string;
  /** 选股条件列表，items schema: {field: string(字段标识), fieldLabel: string(字段中文名), operator: string(运算符gt/gte/lt/lte/eq/between), value: number/array(数值或两元素数组), unit: string(单位可选), window: string(窗口可选), dataSource: string(数据来源字符串)} */
  conditions: unknown[];
}
// ---- end:ai-stock-screen-parser ----