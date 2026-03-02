export interface ICacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(
    keyValuePairs: { key: string; value: string; ttl?: number }[],
  ): Promise<void>;
  increment(key: string): Promise<number>;
  decrement(key: string): Promise<number>;
  getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T>;
  withLock<T>(
    key: string,
    callback: () => Promise<T>,
    lockTimeout?: number,
  ): Promise<T>;
  healthCheck(): Promise<boolean>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage: string;
  uptime: number;
  connectedClients?: number;
}
