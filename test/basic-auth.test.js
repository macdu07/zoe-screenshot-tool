import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidBasicCredentials } from '../src/app.js';

function basic(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

test('optional basic authentication is disabled without complete credentials', () => {
  assert.equal(hasValidBasicCredentials(undefined, '', ''), true);
  assert.equal(hasValidBasicCredentials(undefined, 'admin', ''), true);
});

test('validates complete basic credentials', () => {
  assert.equal(hasValidBasicCredentials(basic('admin', 'secret'), 'admin', 'secret'), true);
  assert.equal(hasValidBasicCredentials(basic('admin', 'wrong'), 'admin', 'secret'), false);
  assert.equal(hasValidBasicCredentials(undefined, 'admin', 'secret'), false);
});
