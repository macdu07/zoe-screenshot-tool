import fs from 'node:fs/promises';
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
    try { const value = JSON.parse(await fs.readFile(this.historyFile, 'utf8')); this.history = Array.isArray(value) ? value.slice(0, this.limit) : []; }
    catch (error) { if (error.code !== 'ENOENT') console.warn('Could not load screenshot history:', error.message); }
  }

  list() { return this.history.map((item) => ({ ...item })); }

  async saveFile(filename, buffer) { await fs.writeFile(path.join(this.storageDir, path.basename(filename)), buffer); }

  async add(item) {
    this.history.unshift(item);
    const evicted = this.history.splice(this.limit);
    await Promise.all(evicted.map((entry) => this.#unlink(entry.filename)));
    await this.#persist();
  }

  async delete(id) {
    const index = this.history.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const [item] = this.history.splice(index, 1);
    await this.#unlink(item.filename);
    await this.#persist();
    return true;
  }

  async clear() {
    const names = new Set(this.history.map(({ filename }) => filename));
    try { (await fs.readdir(this.storageDir)).filter((name) => name !== '.gitkeep').forEach((name) => names.add(name)); } catch {}
    const results = await Promise.all([...names].map((name) => this.#unlink(name)));
    this.history = [];
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
