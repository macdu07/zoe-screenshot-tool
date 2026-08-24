import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export class FileScreenshotRepository {
  constructor({ storageDir, historyFile, limit = 30 }) {
    this.storageDir = storageDir;
    this.historyFile = historyFile;
    this.limit = limit;
    this.history = [];
    this.writeChain = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.storageDir, { recursive: true });
    try { const value = JSON.parse(await fs.readFile(this.historyFile, 'utf8')); this.history = Array.isArray(value) ? value : []; }
    catch (error) { if (error.code !== 'ENOENT') console.warn('Could not load screenshot history:', error.message); }
  }

  list(ownerId) {
    return this.history.filter((item) => item.ownerId === ownerId).map(({ ownerId: ignored, ...item }) => item);
  }

  async ready() {
    await fs.access(this.storageDir, constants.R_OK | constants.W_OK);
    return true;
  }

  async saveFile(filename, buffer) { await fs.writeFile(path.join(this.storageDir, path.basename(filename)), buffer); }

  async add(item) {
    this.history.unshift(item);
    const evicted = this.history.filter((entry) => entry.ownerId === item.ownerId).slice(this.limit);
    const evictedIds = new Set(evicted.map((entry) => entry.id));
    this.history = this.history.filter((entry) => !evictedIds.has(entry.id));
    await Promise.all(evicted.map((entry) => this.#unlink(entry.filename)));
    await this.#persist();
  }

  async delete(id, ownerId) {
    const index = this.history.findIndex((item) => item.id === id && item.ownerId === ownerId);
    if (index < 0) return false;
    const [item] = this.history.splice(index, 1);
    await this.#unlink(item.filename);
    await this.#persist();
    return true;
  }

  async clear(ownerId) {
    const owned = this.history.filter((item) => item.ownerId === ownerId);
    const results = await Promise.all(owned.map(({ filename }) => this.#unlink(filename)));
    this.history = this.history.filter((item) => item.ownerId !== ownerId);
    await this.#persist();
    return { deleted: results.filter(Boolean).length };
  }

  async #unlink(filename) { try { await fs.unlink(path.join(this.storageDir, path.basename(filename))); return true; } catch (error) { if (error.code !== 'ENOENT') console.error('Could not delete screenshot:', error.message); return false; } }

  #persist() {
    this.writeChain = this.writeChain.then(async () => {
      const temporary = `${this.historyFile}.${process.pid}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(this.history, null, 2), 'utf8');
      await fs.rename(temporary, this.historyFile);
    });
    return this.writeChain;
  }
}
