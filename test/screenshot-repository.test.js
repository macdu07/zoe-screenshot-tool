import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FileScreenshotRepository } from '../src/infrastructure/screenshot-repository.js';

test('evicts metadata and its file together', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zoe-repository-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const storageDir = path.join(root, 'screenshots');
  const repository = new FileScreenshotRepository({ storageDir, historyFile: path.join(root, 'history.json'), limit: 1 });
  await repository.init();
  await repository.saveFile('first.png', Buffer.from('first'));
  await repository.add({ id: 'first', filename: 'first.png' });
  await repository.saveFile('second.png', Buffer.from('second'));
  await repository.add({ id: 'second', filename: 'second.png' });
  assert.deepEqual(repository.list(), [{ id: 'second', filename: 'second.png' }]);
  await assert.rejects(fs.access(path.join(storageDir, 'first.png')));
});
