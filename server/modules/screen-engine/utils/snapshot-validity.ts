import type { ConditionField } from '@shared/api.interface';

export interface SnapshotValidityInput {
  poolCode: string;
  usedFields: Set<ConditionField>;
  financialReportPeriod: string | null;
  createdAt: number;
  ttlMs: number;
  nowMs: number;
}

export interface SnapshotRequirement {
  poolCode: string;
  requiredFields: Set<ConditionField>;
  requireFinancialReport?: string | null;
}

export type SnapshotValidityResult =
  | { valid: true; reason: null }
  | { valid: false; reason: string };

export function checkSnapshotValidity(
  snap: SnapshotValidityInput,
  required: SnapshotRequirement,
): SnapshotValidityResult {
  if (snap.poolCode !== required.poolCode) {
    return { valid: false, reason: `股票池不一致: ${snap.poolCode} vs ${required.poolCode}` };
  }

  if (snap.nowMs - snap.createdAt > snap.ttlMs) {
    return { valid: false, reason: '快照已过期，超过有效时间' };
  }

  const missingFields: string[] = [];
  for (const f of required.requiredFields) {
    if (!snap.usedFields.has(f)) {
      missingFields.push(f);
    }
  }
  if (missingFields.length > 0) {
    return { valid: false, reason: `快照缺少字段: ${missingFields.join(', ')}` };
  }

  if (required.requireFinancialReport !== undefined && required.requireFinancialReport !== null) {
    if (snap.financialReportPeriod !== required.requireFinancialReport) {
      return {
        valid: false,
        reason: `财务报告期不一致: 快照=${snap.financialReportPeriod ?? '无'}, 要求=${required.requireFinancialReport}`,
      };
    }
  }

  return { valid: true, reason: null };
}
