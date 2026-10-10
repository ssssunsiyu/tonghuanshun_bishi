import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSnapshotValidity, type SnapshotValidityInput, type SnapshotRequirement } from './snapshot-validity';

const TTL = 10 * 60 * 1000;
const NOW = new Date('2025-06-01T12:00:00Z').getTime();

function makeSnap(
  overrides: Partial<SnapshotValidityInput> = {},
): SnapshotValidityInput {
  return {
    poolCode: '000300.SH',
    usedFields: new Set(['pe_ttm', 'pb_mrq'] as const),
    financialReportPeriod: '2025Q1',
    createdAt: NOW - 5 * 60 * 1000,
    ttlMs: TTL,
    nowMs: NOW,
    ...overrides,
  };
}

function makeReq(
  overrides: Partial<SnapshotRequirement> = {},
): SnapshotRequirement {
  return {
    poolCode: '000300.SH',
    requiredFields: new Set(['pe_ttm', 'pb_mrq'] as const),
    ...overrides,
  };
}

test('快照有效: 股票池一致、字段齐全、未过期 → valid=true', () => {
  const result = checkSnapshotValidity(makeSnap(), makeReq());
  assert.equal(result.valid, true);
  assert.equal(result.reason, null);
});

test('快照失效: 股票池不一致 → valid=false，给出原因', () => {
  const result = checkSnapshotValidity(
    makeSnap({ poolCode: '000300.SH' }),
    makeReq({ poolCode: '000905.SH' }),
  );
  assert.equal(result.valid, false);
  assert.ok(result.reason !== null && result.reason.includes('股票池不一致'));
});

test('快照失效: 超过TTL过期 → valid=false，给出原因', () => {
  const result = checkSnapshotValidity(
    makeSnap({ createdAt: NOW - TTL - 1000 }),
    makeReq(),
  );
  assert.equal(result.valid, false);
  assert.ok(result.reason !== null && result.reason.includes('过期'));
});

test('快照失效: 缺少必需字段 → valid=false，列出缺的字段', () => {
  const result = checkSnapshotValidity(
    makeSnap(),
    makeReq({ requiredFields: new Set(['pe_ttm', 'revenue_yoy'] as const) }),
  );
  assert.equal(result.valid, false);
  assert.ok(result.reason !== null && result.reason.includes('revenue_yoy'));
});

test('快照失效: 财务报告期不一致 → valid=false，给出原因', () => {
  const result = checkSnapshotValidity(
    makeSnap({ financialReportPeriod: '2025Q1' }),
    makeReq({ requireFinancialReport: '2024Q4' }),
  );
  assert.equal(result.valid, false);
  assert.ok(
    result.reason !== null && result.reason.includes('报告期不一致'),
    result.reason ?? 'empty reason',
  );
});

test('快照有效: 不需要财务字段时报告期不比较', () => {
  const result = checkSnapshotValidity(
    makeSnap({ financialReportPeriod: '2025Q1' }),
    makeReq({ requiredFields: new Set(['pe_ttm'] as const) }),
  );
  assert.equal(result.valid, true);
});

test('快照失效: 条件字段变更后快照不覆盖新条件 → valid=false', () => {
  const oldSnap = makeSnap({ usedFields: new Set(['pe_ttm'] as const) });
  const newReq = makeReq({ requiredFields: new Set(['pe_ttm', 'volatility_20d'] as const) });
  const result = checkSnapshotValidity(oldSnap, newReq);
  assert.equal(result.valid, false);
  assert.ok(result.reason !== null && result.reason.includes('volatility_20d'));
});

test('快照有效: TTL 边界内 → valid=true', () => {
  const result = checkSnapshotValidity(
    makeSnap({ createdAt: NOW - TTL + 1 }),
    makeReq(),
  );
  assert.equal(result.valid, true);
});
