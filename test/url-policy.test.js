import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeUrl, isPrivateAddress, normalizeHttpUrl } from '../src/infrastructure/url-policy.js';

test('normalizes public HTTP URLs', () => {
  assert.equal(normalizeHttpUrl('example.com/path'), 'https://example.com/path');
});

test('rejects local-file and credential-bearing URLs', () => {
  assert.throws(() => normalizeHttpUrl('file:///etc/passwd'), { code: 'FORBIDDEN_TARGET' });
  assert.throws(() => normalizeHttpUrl('https://user:pass@example.com'), { code: 'FORBIDDEN_TARGET' });
});

test('recognizes private and reserved IP ranges', () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.20.1.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1']) assert.equal(isPrivateAddress(address), true, address);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
});

test('rejects hostnames resolving to private addresses', async () => {
  const lookup = async () => [{ address: '127.0.0.1', family: 4 }];
  await assert.rejects(assertSafeUrl('https://example.com', { lookup }), { code: 'FORBIDDEN_TARGET' });
});

test('accepts hostnames when every resolved address is public', async () => {
  const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  assert.equal(await assertSafeUrl('example.com', { lookup }), 'https://example.com/');
});
