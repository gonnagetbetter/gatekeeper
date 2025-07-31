import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { LoggerModule } from './logger/logger.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [LoggerModule, CacheModule, AuthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
