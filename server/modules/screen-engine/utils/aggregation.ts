import type { ScreenStatus, ConditionResult } from '@shared/api.interface';

export interface AggregatedResult {
  overallStatus: ScreenStatus;
  includedCount: number;
  excludedCount: number;
  unknownCount: number;
}

/**
 * 按确定性 AND 语义聚合单只股票的所有条件结果。
 * 优先级：excluded（明确 fail）> unknown（数据缺失/无法判断）> included（全部 pass）
 * - 任一条件 excluded → 整体 excluded
 * - 无 excluded，但至少一个 unknown → 整体 unknown
 * - 全部 included → 整体 included
 * - 零条件：抛错，调用方应阻止空筛选
 */
export function aggregateConditionResults(
  conditionResults: ConditionResult[],
): AggregatedResult {
  if (conditionResults.length === 0) {
    throw new Error('零条件无法聚合：请至少添加一条筛选条件');
  }

  let includedCount = 0;
  let excludedCount = 0;
  let unknownCount = 0;
  for (const cr of conditionResults) {
    if (cr.status === 'included') includedCount += 1;
    else if (cr.status === 'excluded') excludedCount += 1;
    else unknownCount += 1;
  }

  let overallStatus: ScreenStatus;
  if (excludedCount > 0) {
    overallStatus = 'excluded';
  } else if (unknownCount > 0) {
    overallStatus = 'unknown';
  } else {
    overallStatus = 'included';
  }

  return { overallStatus, includedCount, excludedCount, unknownCount };
}
