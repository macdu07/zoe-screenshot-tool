import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAnonymousClient } from '../src/middleware/anonymous-client.js';

test('creates and subsequently validates a signed anonymous client cookie', () => {
  const created = resolveAnonymousClient();
  assert.equal(created.isNew, true);
  assert.match(created.id, /^[a-f0-9]{32}$/);
  const resolved = resolveAnonymousClient(`other=value; zoe_client=${encodeURIComponent(created.token)}`);
  assert.equal(resolved.isNew, false);
  assert.equal(resolved.id, created.id);
});

test('replaces a tampered anonymous client cookie', () => {
  const created = resolveAnonymousClient();
  const tampered = resolveAnonymousClient(`zoe_client=${encodeURIComponent(`${created.id}.invalid`)}`);
  assert.equal(tampered.isNew, true);
  assert.notEqual(tampered.id, created.id);
});
