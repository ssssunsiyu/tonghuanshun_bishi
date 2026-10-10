import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFuyaoKeyAvailable, classifyFuyaoHttpError } from './key-check';

test('无Key: Key 为 null → 返回明确错误态，非静默空', () => {
  const result = checkFuyaoKeyAvailable(null);
  assert.equal(result.ok, false);
  assert.ok(result.error !== null && result.error.length > 0);
  assert.match(result.error, /未配置/);
});

test('无Key: Key 为 undefined → 返回明确错误态', () => {
  const result = checkFuyaoKeyAvailable(undefined);
  assert.equal(result.ok, false);
  assert.ok(result.error !== null && result.error.length > 0);
});

test('无Key: Key 为空字符串 → 返回明确错误态', () => {
  const result = checkFuyaoKeyAvailable('');
  assert.equal(result.ok, false);
  assert.ok(result.error !== null && result.error.length > 0);
});

test('无Key: Key 为纯空白 → 返回明确错误态', () => {
  const result = checkFuyaoKeyAvailable('   ');
  assert.equal(result.ok, false);
  assert.ok(result.error !== null && result.error.length > 0);
});

test('有效Key: 非空字符串 → ok=true, error=null', () => {
  const result = checkFuyaoKeyAvailable('some-fake-key-for-test');
  assert.equal(result.ok, true);
  assert.equal(result.error, null);
});

test('失效Key: HTTP 401 → 鉴权失败错误类型', () => {
  const result = classifyFuyaoHttpError(401);
  assert.equal(result.type, 'auth');
  assert.match(result.message, /鉴权失败/);
});

test('失效Key: HTTP 403 → 鉴权失败错误类型', () => {
  const result = classifyFuyaoHttpError(403);
  assert.equal(result.type, 'auth');
  assert.match(result.message, /鉴权失败/);
});

test('业务错误: body code 非0 → business 类型', () => {
  const result = classifyFuyaoHttpError(200, 1001);
  assert.equal(result.type, 'business');
});

test('网络错误: status undefined → network 类型', () => {
  const result = classifyFuyaoHttpError(undefined);
  assert.equal(result.type, 'network');
});

test('其他HTTP错误: 500 → unknown 类型', () => {
  const result = classifyFuyaoHttpError(500);
  assert.equal(result.type, 'unknown');
  assert.match(result.message, /HTTP 500/);
});
