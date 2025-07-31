import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await this.redis.get(key);
      if (cachedData) {
        this.logger.log(`Data with key ${key} was found in cache`);
        await this.prolongKeyTtl(key);
        return JSON.parse(cachedData) as T;
      }
    } catch (e) {
      this.logger.error(`Error getting data from cache with key ${key}`, e);
    }
    this.logger.log(`Data with key ${key} was not found in cache`);
    return null;
  }

  async set(
    key: string,
    value: any,
    expirationInSeconds: number = 60 * 60 * 24,
  ): Promise<void> {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        expirationInSeconds,
      );
      this.logger.log(`Data with key ${key} was cached successfully`);
    } catch (e) {
      this.logger.error(`Error caching data with key ${key}`, e);
    }
  }

  async setMulti(
    keyValuePairs: { key: string; value: any }[],
    expirationInSeconds: number = 60 * 60 * 24,
  ): Promise<void> {
    try {
      const multi = this.redis.multi();

      for (const { key, value } of keyValuePairs) {
        multi.set(
          key,
          typeof value === 'string' ? value : JSON.stringify(value),
          'EX',
          expirationInSeconds,
        );
      }

      await multi.exec();
      this.logger.log('Multiple keys were cached successfully');
    } catch (e) {
      this.logger.error(`Error caching multiple keys`, e);
    }
  }

  async prolongKeyTtl(
    key: string,
    expirationInSeconds: number = 60 * 60 * 6,
  ): Promise<void> {
    try {
      const currentTtl = await this.redis.ttl(key);
      if (currentTtl > expirationInSeconds) {
        return;
      } else {
        await this.redis.expire(key, expirationInSeconds);
        this.logger.log(
          `TTL with key ${key} was set to ${expirationInSeconds / 3600} hours`,
        );
      }
    } catch (e) {
      this.logger.error(`Error prolonging ${key} TTL`, e);
    }
  }
}
