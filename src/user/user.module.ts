import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [AuthGuard, CacheModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
