import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateConditionResults } from './aggregation';
import type { ConditionResult, ScreenStatus } from '@shared/api.interface';

function makeResult(status: ScreenStatus): ConditionResult {
  return {
    conditionId: `cond-${status}-${Math.random().toString(36).slice(2, 8)}`,
    field: 'pe_ttm',
    fieldLabel: '市盈率(TTM)',
    operator: 'lt',
    threshold: 20,
    actualValue: status === 'included' ? 10 : status === 'excluded' ? 30 : null,
    status,
    reason: status === 'unknown' ? '数据缺失，无法判断' : '',
    unit: '倍',
  };
}

test('聚合: 全 pass → 入选 (included)', () => {
  const results = [makeResult('included'), makeResult('included')];
  const agg = aggregateConditionResults(results);
  assert.equal(agg.overallStatus, 'included');
  assert.equal(agg.includedCount, 2);
  assert.equal(agg.excludedCount, 0);
  assert.equal(agg.unknownCount, 0);
});

test('聚合: pass + unknown → 无法判断 (unknown)，不得入选', () => {
  const results = [makeResult('included'), makeResult('unknown')];
  const agg = aggregateConditionResults(results);
  assert.equal(agg.overallStatus, 'unknown');
  assert.equal(agg.includedCount, 1);
  assert.equal(agg.excludedCount, 0);
  assert.equal(agg.unknownCount, 1);
});

test('聚合: fail + unknown → 排除 (excluded)，不得因unknown拉成无法判断', () => {
  const results = [makeResult('excluded'), makeResult('unknown')];
  const agg = aggregateConditionResults(results);
  assert.equal(agg.overallStatus, 'excluded');
  assert.equal(agg.includedCount, 0);
  assert.equal(agg.excludedCount, 1);
  assert.equal(agg.unknownCount, 1);
});

test('聚合: fail + pass + unknown → 排除 (excluded)，优先级最高', () => {
  const results = [
    makeResult('excluded'),
    makeResult('included'),
    makeResult('unknown'),
  ];
  const agg = aggregateConditionResults(results);
  assert.equal(agg.overallStatus, 'excluded');
  assert.equal(agg.excludedCount, 1);
  assert.equal(agg.includedCount, 1);
  assert.equal(agg.unknownCount, 1);
});

test('聚合: 全 unknown → 无法判断 (unknown)', () => {
  const results = [makeResult('unknown'), makeResult('unknown')];
  const agg = aggregateConditionResults(results);
  assert.equal(agg.overallStatus, 'unknown');
  assert.equal(agg.includedCount, 0);
  assert.equal(agg.excludedCount, 0);
  assert.equal(agg.unknownCount, 2);
});

test('聚合: 零条件 → 抛错禁止筛选', () => {
  assert.throws(
    () => aggregateConditionResults([]),
    /零条件无法聚合/,
  );
});

test('聚合: 单条件 pass → 入选', () => {
  const agg = aggregateConditionResults([makeResult('included')]);
  assert.equal(agg.overallStatus, 'included');
  assert.equal(agg.includedCount, 1);
});

test('聚合: 单条件 fail → 排除', () => {
  const agg = aggregateConditionResults([makeResult('excluded')]);
  assert.equal(agg.overallStatus, 'excluded');
  assert.equal(agg.excludedCount, 1);
});

test('聚合: 单条件 unknown → 无法判断', () => {
  const agg = aggregateConditionResults([makeResult('unknown')]);
  assert.equal(agg.overallStatus, 'unknown');
  assert.equal(agg.unknownCount, 1);
});

test('聚合: 计数守恒 - 批量样本三类之和等于总数', () => {
  const samples: ConditionResult[][] = [
    Array.from({ length: 5 }, () => makeResult('included')),
    Array.from({ length: 3 }, () => makeResult('excluded')),
    Array.from({ length: 4 }, () => makeResult('unknown')),
    [makeResult('included'), makeResult('excluded')],
    [makeResult('included'), makeResult('unknown')],
    [makeResult('excluded'), makeResult('unknown')],
    [makeResult('included'), makeResult('excluded'), makeResult('unknown')],
  ];

  const counts = { included: 0, excluded: 0, unknown: 0 };
  for (const sample of samples) {
    const agg = aggregateConditionResults(sample);
    counts[agg.overallStatus as 'included' | 'excluded' | 'unknown'] += 1;
  }

  const total = counts.included + counts.excluded + counts.unknown;
  assert.equal(total, samples.length, '三类之和必须等于样本总数，不漏不重');
  assert.equal(counts.excluded, 4, '任一 fail 则 excluded');
  assert.equal(counts.unknown, 2, '无 fail 有 unknown 则 unknown');
  assert.equal(counts.included, 1, '全 pass 才 included');
});
