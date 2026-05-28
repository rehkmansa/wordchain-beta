// Single-slot async mutex. Each acquire returns a release fn; subsequent
// acquires wait until release. Run-to-completion: no preemption.
export class Mutex {
  private chain: Promise<void> = Promise.resolve();

  async run<T>(fn: () => Promise<T> | T): Promise<T> {
    const prev = this.chain;
    let release!: () => void;
    this.chain = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await prev;
      return await fn();
    } finally {
      release();
    }
  }
}
