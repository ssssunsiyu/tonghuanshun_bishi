import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVolatility20d,
  VOLATILITY_WINDOW_DAYS,
  TRADING_DAYS_PER_YEAR,
} from './volatility';
import type { KlinePoint } from './kline';

const CODE = '600000.SH';
const BENCHMARK_CODE = '000300.SH';

function makeKlines(
  count: number,
  closeFn: (i: number) => number | null,
  startDay = 0,
): KlinePoint[] {
  const result: KlinePoint[] = [];
  const baseTs = new Date('2025-01-01T00:00:00Z').getTime();
  for (let i = 0; i < count; i++) {
    result.push({
      dateMs: baseTs + (startDay + i) * 86400 * 1000,
      close: closeFn(i),
    });
  }
  return result;
}

function makeBenchmarkForKlines(klines: KlinePoint[]): KlinePoint[] {
  return klines.map((k: KlinePoint) => ({ dateMs: k.dateMs, close: 1000 }));
}

test('volatility20d: 0个收盘时点 → unknown', () => {
  const result = calculateVolatility20d(CODE, [], {
    benchmarkKlines: makeKlines(30, () => 1000),
  });
  assert.equal(result.volatility20d, null);
  assert.equal(result.dataPoints, 0);
  assert.equal(result.windowDays, VOLATILITY_WINDOW_DAYS);
  assert.equal(result.gapReason, '窗口内有效数据点不足');
});

test('volatility20d: 1个收盘时点 → unknown', () => {
  const result = calculateVolatility20d(CODE, makeKlines(1, () => 10), {
    benchmarkKlines: makeKlines(30, () => 1000),
  });
  assert.equal(result.volatility20d, null);
  assert.equal(result.dataPoints, 0);
});

test('volatility20d: 2个收盘时点 → unknown', () => {
  const result = calculateVolatility20d(CODE, makeKlines(2, (i) => 10 + i), {
    benchmarkKlines: makeKlines(30, () => 1000),
  });
  assert.equal(result.volatility20d, null);
  assert.equal(result.dataPoints, 1);
});

test('volatility20d: 21个有效时点+对齐基准 → 可计算，值=样本std×√252×100', () => {
  const closes = [
    100, 101, 99, 102, 98, 103, 97, 104, 96, 105,
    95, 106, 94, 107, 93, 108, 92, 109, 91, 110,
    90,
  ];
  const klines = makeKlines(closes.length, (i) => closes[i]);
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  const expected = Math.round(stdDev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100 * 100) / 100;

  assert.equal(result.volatility20d, expected);
  assert.equal(result.dataPoints, 20);
  assert.ok(result.volatility20d !== null && result.volatility20d > 0);
  assert.equal(result.gapReason, undefined);
});

test('volatility20d: 等涨2%的21天+对齐基准 → 波动率为0', () => {
  const closes: number[] = [];
  let price = 100;
  for (let i = 0; i < 21; i++) {
    closes.push(price);
    price = price * 1.02;
  }
  const klines = makeKlines(21, (i) => closes[i]);
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });

  assert.equal(result.volatility20d, 0);
  assert.equal(result.dataPoints, 20);
});

test('volatility20d: 窗口内出现 null → unknown', () => {
  const klines = makeKlines(25, (i) => (i === 15 ? null : 100 + i));
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.equal(result.volatility20d, null);
  assert.equal(result.gapReason, '窗口内有效数据点不足');
});

test('volatility20d: 窗口内出现0价 → unknown', () => {
  const klines = makeKlines(25, (i) => (i === 10 ? 0 : 100 + i));
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.equal(result.volatility20d, null);
});

test('volatility20d: 窗口内出现负价 → unknown', () => {
  const klines = makeKlines(25, (i) => (i === 8 ? -5 : 100 + i));
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.equal(result.volatility20d, null);
});

test('volatility20d: 窗口内出现 NaN/Infinity → unknown', () => {
  const klines = makeKlines(25, (i) => (i === 12 ? Number.NaN : 100 + i));
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.equal(result.volatility20d, null);
});

test('volatility20d: 同一交易日同价重复 → 去重后仍可计算', () => {
  const baseTs = new Date('2025-01-01T00:00:00Z').getTime();
  const klines: KlinePoint[] = [];
  for (let i = 0; i < 21; i++) {
    const dateMs = baseTs + i * 86400 * 1000;
    const price = 100 + i;
    klines.push({ dateMs, close: price });
    klines.push({ dateMs, close: price });
  }
  const benchmark = makeBenchmarkForKlines(klines);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.ok(result.volatility20d !== null && result.volatility20d > 0);
  assert.equal(result.dataPoints, 20);
});

test('volatility20d: 同一交易日异价冲突 → unknown', () => {
  const baseTs = new Date('2025-01-01T00:00:00Z').getTime();
  const klines: KlinePoint[] = [];
  for (let i = 0; i < 25; i++) {
    const dateMs = baseTs + i * 86400 * 1000;
    klines.push({ dateMs, close: 100 + i });
    if (i === 10) {
      klines.push({ dateMs, close: 999 });
    }
  }
  const result = calculateVolatility20d(CODE, klines);
  assert.equal(result.volatility20d, null);
});

test('volatility20d: 无基准交易日历时 不判连续 直接返回unknown + 不可验证原因', () => {
  const klines = makeKlines(25, (i) => 100 + i);
  const result = calculateVolatility20d(CODE, klines, {
    requireContinuousWindow: true,
  });
  assert.equal(result.volatility20d, null);
  assert.equal(result.gapReason, '缺乏权威交易日历，窗口连续性不可验证');
});

test('volatility20d: 基准为空数组时 同样返回不可验证', () => {
  const klines = makeKlines(25, (i) => 100 + i);
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: [] });
  assert.equal(result.volatility20d, null);
  assert.equal(result.gapReason, '缺乏权威交易日历，窗口连续性不可验证');
});

test('volatility20d: 基准与个股交易日完全对齐 含周末/节假日大间隔也判连续', () => {
  const baseTs = new Date('2025-09-26T00:00:00Z').getTime();
  const tradingDates = [
    0, 1, 2, 3, 4,
    7, 8, 9, 10, 11,
    14, 15, 16, 17, 18,
    21, 22, 23, 24, 25,
    28,
  ];
  const klines: KlinePoint[] = tradingDates.map(
    (d: number, i: number) => ({ dateMs: baseTs + d * 86400 * 1000, close: 100 + i }),
  );
  const benchmark: KlinePoint[] = tradingDates.map(
    (d: number) => ({ dateMs: baseTs + d * 86400 * 1000, close: 3000 }),
  );

  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.ok(result.volatility20d !== null, '周末/节假日休市不应判缺口');
  assert.equal(result.dataPoints, 20);
  assert.equal(result.gapReason, undefined);
});

test('volatility20d: 基准有交易日但个股停牌缺一天 → unknown + 个股缺失原因', () => {
  const baseTs = new Date('2025-01-01T00:00:00Z').getTime();
  const benchmark: KlinePoint[] = [];
  for (let i = 0; i < 25; i++) {
    benchmark.push({ dateMs: baseTs + i * 86400 * 1000, close: 3000 });
  }
  const stock: KlinePoint[] = [];
  for (let i = 0; i < 25; i++) {
    if (i === 12) continue;
    stock.push({ dateMs: baseTs + i * 86400 * 1000, close: 100 + i });
  }

  const result = calculateVolatility20d(CODE, stock, { benchmarkKlines: benchmark });
  assert.equal(result.volatility20d, null);
  assert.equal(result.gapReason, '对照基准指数交易日，窗口内存在个股缺失');
});

test('volatility20d: requireContinuousWindow=false 无基准也直接计算', () => {
  const closes: number[] = [];
  let price = 100;
  for (let i = 0; i < 21; i++) {
    closes.push(price);
    price = price * 1.02;
  }
  const klines = makeKlines(21, (i) => closes[i]);
  const result = calculateVolatility20d(CODE, klines, {
    requireContinuousWindow: false,
  });
  assert.equal(result.volatility20d, 0);
  assert.equal(result.dataPoints, 20);
});

test('volatility20d: 短历史(不足21个有效时点) → unknown 而非 0', () => {
  const result = calculateVolatility20d(CODE, makeKlines(15, (i) => 100 + i), {
    benchmarkKlines: makeKlines(30, () => 1000),
  });
  assert.equal(result.volatility20d, null, '不足21个有效时点应返回 unknown，不得返回 0');
  assert.equal(result.dataPoints, 14);
  assert.equal(result.gapReason, '窗口内有效数据点不足');
});

test('volatility20d: 乱序输入 → 按日期排序后计算', () => {
  const baseTs = new Date('2025-01-01T00:00:00Z').getTime();
  const klines: KlinePoint[] = [];
  for (let i = 20; i >= 0; i--) {
    klines.push({ dateMs: baseTs + i * 86400 * 1000, close: 100 + i });
  }
  const benchmark = makeBenchmarkForKlines([...klines].sort((a, b) => a.dateMs - b.dateMs));
  const result = calculateVolatility20d(CODE, klines, { benchmarkKlines: benchmark });
  assert.ok(result.volatility20d !== null && result.volatility20d > 0);
  assert.equal(result.dataPoints, 20);
});

test('volatility20d: 国庆长假休市 基准与个股同时缺 应判连续', () => {
  const baseTs = new Date('2025-09-25T00:00:00Z').getTime();
  const tradingDates = [
    0, 1, 2, 3, 4,
    7, 8, 9, 10, 11,
    14, 15,
    22, 23, 24, 25, 26,
    29, 30, 31, 32, 33,
  ];
  const stockKlines: KlinePoint[] = tradingDates.map(
    (d: number, i: number) => ({ dateMs: baseTs + d * 86400 * 1000, close: 100 + i }),
  );
  const benchmarkKlines: KlinePoint[] = tradingDates.map(
    (d: number) => ({ dateMs: baseTs + d * 86400 * 1000, close: 3500 }),
  );

  const result = calculateVolatility20d(BENCHMARK_CODE, stockKlines, { benchmarkKlines });
  assert.ok(
    result.volatility20d !== null,
    '国庆长假基准与个股同时休市不应判缺口',
  );
  assert.equal(result.dataPoints, 20);
  assert.equal(result.gapReason, undefined);
});
