export class DataCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  constructor(private ttlMs: number = 60 * 1000) {}

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return item.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }
}
