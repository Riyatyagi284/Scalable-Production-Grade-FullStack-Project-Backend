import { RedisCacheService } from './CacheService';
import { MemoryCacheService } from './MemoryCacheService';
import { ICacheService } from './types';
import logger from '../config/logger';

export class CacheFactory {
  static createCacheService(config: {
    type: 'redis' | 'memory';
    redisConfig?: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
    };
    memoryConfig?: {
      defaultTTL?: number;
    };
  }): ICacheService {
    switch (config.type) {
      case 'redis':
        if (!config.redisConfig) {
          throw new Error('Redis config required for redis cache type');
        }
        logger.info('Creating Redis cache service');
        return new RedisCacheService(config.redisConfig);
        
      case 'memory':
        logger.info('Creating in-memory cache service');
        return new MemoryCacheService(config.memoryConfig?.defaultTTL);
        
      default:
        throw new Error(`Unknown cache type: ${config.type}`);
    }
  }
}