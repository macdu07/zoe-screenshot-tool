import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureQueue } from '../src/infrastructure/capture-queue.js';

test('limits active jobs and rejects overflow', async () => {
  const queue = new CaptureQueue({ concurrency: 1, maxPending: 1 });
  let release;
  const blocker = new Promise((resolve) => { release = resolve; });
  const first = queue.add(() => blocker);
  const second = queue.add(() => 'second');
  await assert.rejects(queue.add(() => 'overflow'), { code: 'QUEUE_FULL' });
  assert.deepEqual(queue.stats(), { active: 1, pending: 1, concurrency: 1 });
  release('first');
  assert.equal(await first, 'first');
  assert.equal(await second, 'second');
});
