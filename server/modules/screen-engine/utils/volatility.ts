import type { StockVolatility } from '@shared/api.interface';
import type { KlinePoint } from './kline';

export const VOLATILITY_WINDOW_DAYS = 20;
export const TRADING_DAYS_PER_YEAR = 252;

const GAP_REASON_INSUFFICIENT = '窗口内有效数据点不足';
const GAP_REASON_UNVERIFIABLE = '缺乏权威交易日历，窗口连续性不可验证';
const GAP_REASON_BENCHMARK_GAP = '对照基准指数交易日，窗口内存在个股缺失';

export function calculateVolatility20d(
  thscode: string,
  klines: KlinePoint[],
  options: {
    benchmarkKlines?: KlinePoint[];
    requireContinuousWindow?: boolean;
  } = {},
): StockVolatility {
  const requireContinuous = options.requireContinuousWindow ?? true;
  const benchmarkKlines = options.benchmarkKlines ?? null;
  const sorted = [...klines].sort((a, b) => a.dateMs - b.dateMs);

  const deduped: KlinePoint[] = [];
  let hasConflict = false;
  for (const row of sorted) {
    const last = deduped[deduped.length - 1];
    if (last && last.dateMs === row.dateMs) {
      if (last.close !== row.close) {
        hasConflict = true;
        break;
      }
    } else {
      deduped.push(row);
    }
  }

  const requiredCloses = VOLATILITY_WINDOW_DAYS + 1;

  const validCount = deduped.filter(
    (r: KlinePoint) =>
      r.close !== null && r.close > 0 && Number.isFinite(r.close),
  ).length;

  if (hasConflict || deduped.length < requiredCloses) {
    return {
      thscode,
      volatility20d: null,
      dataPoints: validCount > 0 ? validCount - 1 : 0,
      windowDays: VOLATILITY_WINDOW_DAYS,
      gapReason: GAP_REASON_INSUFFICIENT,
    };
  }

  if (requireContinuous) {
    if (!benchmarkKlines || benchmarkKlines.length === 0) {
      return {
        thscode,
        volatility20d: null,
        dataPoints: validCount > 0 ? validCount - 1 : 0,
        windowDays: VOLATILITY_WINDOW_DAYS,
        gapReason: GAP_REASON_UNVERIFIABLE,
      };
    }

    const latestWindow = deduped.slice(-requiredCloses);
    const windowStartMs = latestWindow[0].dateMs;
    const windowEndMs = latestWindow[latestWindow.length - 1].dateMs;

    const benchmarkTradingDays = new Set<number>();
    for (const b of benchmarkKlines) {
      if (b.dateMs >= windowStartMs && b.dateMs <= windowEndMs) {
        benchmarkTradingDays.add(b.dateMs);
      }
    }

    if (benchmarkTradingDays.size === 0) {
      return {
        thscode,
        volatility20d: null,
        dataPoints: validCount > 0 ? validCount - 1 : 0,
        windowDays: VOLATILITY_WINDOW_DAYS,
        gapReason: GAP_REASON_UNVERIFIABLE,
      };
    }

    const stockTradingDays = new Set<number>();
    for (const row of latestWindow) {
      stockTradingDays.add(row.dateMs);
    }

    for (const benchmarkDay of benchmarkTradingDays) {
      if (!stockTradingDays.has(benchmarkDay)) {
        return {
          thscode,
          volatility20d: null,
          dataPoints: validCount > 0 ? validCount - 1 : 0,
          windowDays: VOLATILITY_WINDOW_DAYS,
          gapReason: GAP_REASON_BENCHMARK_GAP,
        };
      }
    }
  }

  const latestWindow = deduped.slice(-requiredCloses);
  const closesInWindow: number[] = [];
  for (const row of latestWindow) {
    if (
      row.close === null ||
      row.close <= 0 ||
      !Number.isFinite(row.close)
    ) {
      return {
        thscode,
        volatility20d: null,
        dataPoints: validCount > 0 ? validCount - 1 : 0,
        windowDays: VOLATILITY_WINDOW_DAYS,
        gapReason: GAP_REASON_INSUFFICIENT,
      };
    }
    closesInWindow.push(row.close);
  }

  const returns: number[] = [];
  for (let i = 1; i < closesInWindow.length; i++) {
    const prev = closesInWindow[i - 1];
    const curr = closesInWindow[i];
    returns.push((curr - prev) / prev);
  }

  const mean = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) /
    (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  const annualizedVolatility = stdDev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;

  return {
    thscode,
    volatility20d: Math.round(annualizedVolatility * 100) / 100,
    dataPoints: returns.length,
    windowDays: VOLATILITY_WINDOW_DAYS,
  };
}
