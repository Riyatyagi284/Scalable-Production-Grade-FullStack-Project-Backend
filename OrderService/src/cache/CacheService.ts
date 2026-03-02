import Redis from "ioredis";
import { ICacheService, CacheStats } from "../cache/types";
import logger from "../config/logger";
import { v4 as uuidv4 } from "uuid";

export class RedisCacheService implements ICacheService {
  private redis: Redis;
  private readonly defaultTTL: number = 3600; // 1 hour
  private hits: number = 0;
  private misses: number = 0;
  private readonly keyPrefix: string;

  constructor(
    redisConfig: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      enableAutoPipelining?: boolean;
      retryStrategy?: (times: number) => number | null;
    },
    defaultTTL?: number,
  ) {
    this.keyPrefix = redisConfig.keyPrefix || "app:";

    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db || 0,
      keyPrefix: this.keyPrefix,
      enableAutoPipelining: redisConfig.enableAutoPipelining || true,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error("Re dis max retry attempts reached");
          return null;
        }
        const delay = Math.min(times * 100, 3000);
        logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      connectTimeout: 10000,
      disconnectTimeout: 5000,
      commandTimeout: 5000,
    });

    this.defaultTTL = defaultTTL || 3600;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.redis.on("connect", () => {
      logger.info("Redis connected successfully");
    });

    this.redis.on("error", (error) => {
      logger.error("Redis connection error:", error);
    });

    this.redis.on("close", () => {
      logger.warn("Redis connection closed");
    });

    this.redis.on("reconnecting", (delay) => {
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);

      if (value) {
        this.hits++;
        logger.debug(`Cache HIT for key: ${key}`);
      } else {
        this.misses++;
        logger.debug(`Cache MISS for key: ${key}`);
      }

      return value;
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
        if (this.defaultTTL) {
          await this.redis.expire(key, this.defaultTTL);
        }
      }

      logger.debug(
        `Cache SET for key: ${key}, TTL: ${ttlSeconds || this.defaultTTL}s`,
      );
    } catch (error) {
      logger.error(`Error setting key ${key} in Redis:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      logger.error(`Error deleting key ${key} from Redis:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      logger.error(`Error setting expiry for key ${key}:`, error);
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Error getting TTL for key ${key}:`, error);
      return -2; // Key not exist
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      if (keys.length === 0) return [];

      const values = await this.redis.mget(keys);

      values.forEach((value, index) => {
        if (value) {
          this.hits++;
          logger.debug(`Cache HIT for key: ${keys[index]}`);
        } else {
          this.misses++;
          logger.debug(`Cache MISS for key: ${keys[index]}`);
        }
      });

      return values;
    } catch (error) {
      logger.error("Error in mget operation:", error);
      return keys.map(() => null);
    }
  }

  async mset(
    keyValuePairs: { key: string; value: string; ttl?: number }[],
  ): Promise<void> {
    try {
      if (keyValuePairs.length === 0) return;

      const pipeline = this.redis.pipeline();

      keyValuePairs.forEach(({ key, value, ttl }) => {
        if (ttl) {
          pipeline.setex(key, ttl, value);
        } else {
          pipeline.set(key, value);
          if (this.defaultTTL) {
            pipeline.expire(key, this.defaultTTL);
          }
        }
      });

      await pipeline.exec();
      logger.debug(`Cache MSET for ${keyValuePairs.length} keys`);
    } catch (error) {
      logger.error("Error in mset operation:", error);
      throw error;
    }
  }

  async increment(key: string): Promise<number> {
    try {
      const value = await this.redis.incr(key);

      // Set expiry if it's a new key
      if (value === 1 && this.defaultTTL) {
        await this.redis.expire(key, this.defaultTTL);
      }

      return value;
    } catch (error) {
      logger.error(`Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      logger.error(`Error decrementing key ${key}:`, error);
      throw error;
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    try {
      const cachedValue = await this.get(key);

      if (cachedValue) {
        return JSON.parse(cachedValue) as T;
      }

      logger.debug(`Cache miss for key ${key}, fetching fresh data`);
      const freshData = await fetchFn();

      await this.set(key, JSON.stringify(freshData), ttlSeconds);

      return freshData;
    } catch (error) {
      logger.error(`Error in getOrSet for key ${key}:`, error);

      return await fetchFn();
    }
  }

  async withLock<T>(
    key: string,
    callback: () => Promise<T>,
    lockTimeout: number = 30,
  ): Promise<T> {
    const lockKey = `lock:${key}`;
    const lockValue = uuidv4();

    try {
      const acquired = await this.redis.set(
        lockKey,
        lockValue,
        // 'NX',
        "EX",
        lockTimeout,
      );

      if (!acquired) {
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.withLock(key, callback, lockTimeout);
      }

      const result = await callback();

      const currentLock = await this.redis.get(lockKey);
      if (currentLock === lockValue) {
        await this.redis.del(lockKey);
      }

      return result;
    } catch (error) {
      const currentLock = await this.redis.get(lockKey);
      if (currentLock === lockValue) {
        await this.redis.del(lockKey);
      }

      logger.error(`Error in withLock for key ${key}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch (error) {
      logger.error("Redis health check failed:", error);
      return false;
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info();
      const keys = await this.redis.dbsize();

      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(.*)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : "unknown";

      // Parse uptime
      const uptimeMatch = info.match(/uptime_in_seconds:(.*)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

      // Parse connected clients
      const clientsMatch = info.match(/connected_clients:(.*)/);
      const connectedClients = clientsMatch
        ? parseInt(clientsMatch[1])
        : undefined;

      return {
        hits: this.hits,
        misses: this.misses,
        keys,
        memoryUsage,
        uptime,
        connectedClients,
      };
    } catch (error) {
      logger.error("Error getting Redis stats:", error);
      return {
        hits: this.hits,
        misses: this.misses,
        keys: 0,
        memoryUsage: "unknown",
        uptime: 0,
      };
    }
  }

  createKey(...parts: string[]): string {
    return parts.join(":");
  }

  async clearPattern(pattern: string): Promise<number> {
    try {
      let cursor = "0";
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          "100",
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          const result = await this.redis.del(...keys);
          deletedCount += result;
        }
      } while (cursor !== "0");

      logger.info(`Cleared ${deletedCount} keys with pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Error clearing pattern ${pattern}:`, error);
      return 0;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info("Redis disconnected gracefully");
    } catch (error) {
      logger.error("Error disconnecting Redis:", error);
      await this.redis.disconnect();
    }
  }
}
