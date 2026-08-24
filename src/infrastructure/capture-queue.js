import { QueueFullError } from '../errors.js';

export class CaptureQueue {
  constructor({ concurrency = 2, maxPending = 20 } = {}) {
    this.concurrency = concurrency;
    this.maxPending = maxPending;
    this.active = 0;
    this.pending = [];
  }

  add(task) {
    if (this.active >= this.concurrency && this.pending.length >= this.maxPending) return Promise.reject(new QueueFullError());
    return new Promise((resolve, reject) => {
      this.pending.push({ task, resolve, reject });
      this.#drain();
    });
  }

  stats() { return { active: this.active, pending: this.pending.length, concurrency: this.concurrency }; }

  #drain() {
    while (this.active < this.concurrency && this.pending.length) {
      const job = this.pending.shift();
      this.active++;
      Promise.resolve().then(job.task).then(job.resolve, job.reject).finally(() => { this.active--; this.#drain(); });
    }
  }
}
