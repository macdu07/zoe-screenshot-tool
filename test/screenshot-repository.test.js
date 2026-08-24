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

test('isolates listing, deletion, and clearing by anonymous owner', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zoe-owners-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const storageDir = path.join(root, 'screenshots');
  const repository = new FileScreenshotRepository({ storageDir, historyFile: path.join(root, 'history.json'), limit: 3 });
  await repository.init();
  await repository.saveFile('alice.png', Buffer.from('alice'));
  await repository.saveFile('bob.png', Buffer.from('bob'));
  await repository.add({ id: 'alice', filename: 'alice.png', ownerId: 'owner-a' });
  await repository.add({ id: 'bob', filename: 'bob.png', ownerId: 'owner-b' });

  assert.deepEqual(repository.list('owner-a'), [{ id: 'alice', filename: 'alice.png' }]);
  assert.equal(await repository.delete('bob', 'owner-a'), false);
  assert.equal(await repository.clear('owner-a').then((result) => result.deleted), 1);
  assert.deepEqual(repository.list('owner-b'), [{ id: 'bob', filename: 'bob.png' }]);
  await fs.access(path.join(storageDir, 'bob.png'));
});
