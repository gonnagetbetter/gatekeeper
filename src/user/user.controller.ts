import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UserMeta } from '../auth/decorator/user-meta.decorator';
import { SelectUser } from '../db/types/user.type';
import { UserMetadata } from '../auth/types/user-metadata.type';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@UserMeta() meta: UserMetadata): Promise<Partial<SelectUser> | null> {
    return this.userService.findByIdSafe(meta.userId);
  }
}
