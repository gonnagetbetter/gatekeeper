import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { config } from '../config';
import { CacheService } from './cache.service';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        if (!config.redisUrl) {
          throw new Error('Redis URL is not defined in config');
        }
        return new Redis(config.redisUrl.toString());
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
