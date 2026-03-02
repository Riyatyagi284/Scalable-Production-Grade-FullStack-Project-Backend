import { ICacheService, CacheStats } from './types';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

interface CacheItem {
  value: string;
  expiresAt: number | null;
}

export class MemoryCacheService implements ICacheService {
  private cache: Map<string, CacheItem>;
  private hits: number = 0;
  private misses: number = 0;
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(defaultTTL: number = 3600) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired items every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Cleaned up ${expiredCount} expired cache items`);
    }
  }

  private isExpired(item: CacheItem): boolean {
    return item.expiresAt !== null && item.expiresAt < Date.now();
  }

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      logger.debug(`Cache MISS for key: ${key}`);
      return null;
    }
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.misses++;
      logger.debug(`Cache MISS (expired) for key: ${key}`);
      return null;
    }
    
    this.hits++;
    logger.debug(`Cache HIT for key: ${key}`);
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds 
      ? Date.now() + (ttlSeconds * 1000)
      : this.defaultTTL 
        ? Date.now() + (this.defaultTTL * 1000)
        : null;
    
    this.cache.set(key, { value, expiresAt });
    logger.debug(`Cache SET for key: ${key}, expires: ${expiresAt ? new Date(expiresAt).toISOString() : 'never'}`);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    logger.debug(`Cache DEL for key: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) return false;
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const item = this.cache.get(key);
    
    if (item && !this.isExpired(item)) {
      item.expiresAt = Date.now() + (ttlSeconds * 1000);
      logger.debug(`Cache EXPIRE for key: ${key}, new expiry: ${new Date(item.expiresAt).toISOString()}`);
    }
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    
    if (!item) return -2;
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return -2;
    }
    
    if (!item.expiresAt) return -1;
    
    return Math.floor((item.expiresAt - Date.now()) / 1000);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValuePairs: { key: string; value: string; ttl?: number }[]): Promise<void> {
    await Promise.all(
      keyValuePairs.map(({ key, value, ttl }) => this.set(key, value, ttl))
    );
  }

  async increment(key: string): Promise<number> {
    const item = this.cache.get(key);
    
    if (!item || this.isExpired(item)) {
      const newValue = '1';
      await this.set(key, newValue);
      return 1;
    }
    
    const currentValue = parseInt(item.value, 10);
    if (isNaN(currentValue)) {
      throw new Error(`Value for key ${key} is not a number`);
    }
    
    const newValue = (currentValue + 1).toString();
    item.value = newValue;
    
    return currentValue + 1;
  }

  async decrement(key: string): Promise<number> {
    const item = this.cache.get(key);
    
    if (!item || this.isExpired(item)) {
      const newValue = '-1';
      await this.set(key, newValue);
      return -1;
    }
    
    const currentValue = parseInt(item.value, 10);
    if (isNaN(currentValue)) {
      throw new Error(`Value for key ${key} is not a number`);
    }
    
    const newValue = (currentValue - 1).toString();
    item.value = newValue;
    
    return currentValue - 1;
  }

  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get(key);
    
    if (cached) {
      return JSON.parse(cached) as T;
    }
    
    const fresh = await fetchFn();
    await this.set(key, JSON.stringify(fresh), ttlSeconds);
    
    return fresh;
  }

  async withLock<T>(
    key: string, 
    callback: () => Promise<T>, 
    lockTimeout: number = 30
  ): Promise<T> {
    const lockKey = `lock:${key}`;
    const lockValue = uuidv4();
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      // Try to acquire lock
      const existingLock = await this.get(lockKey);
      
      if (!existingLock) {
        await this.set(lockKey, lockValue, lockTimeout);
        
        try {
          // Execute callback
          const result = await callback();
          
          // Release lock
          const currentLock = await this.get(lockKey);
          if (currentLock === lockValue) {
            await this.del(lockKey);
          }
          
          return result;
        } catch (error) {
          // Release lock on error
          const currentLock = await this.get(lockKey);
          if (currentLock === lockValue) {
            await this.del(lockKey);
          }
          throw error;
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100 * attempts));
    }
    
    throw new Error(`Failed to acquire lock for key ${key} after ${maxAttempts} attempts`);
  }

  async healthCheck(): Promise<boolean> {
    return true; // Memory cache is always healthy
  }

  async getStats(): Promise<CacheStats> {
    // Cleanup before getting stats
    this.cleanup();
    
    const memoryUsage = process.memoryUsage();
    
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.cache.size,
      memoryUsage: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      uptime: process.uptime()
    };
  }

  async clearPattern(pattern: string): Promise<number> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    logger.info(`Cleared ${deletedCount} keys with pattern: ${pattern}`);
    return deletedCount;
  }

  async disconnect(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    logger.info('Memory cache cleared and disconnected');
  }
}