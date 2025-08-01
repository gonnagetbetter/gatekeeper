import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { Db } from '../db/db.connect';
import { users } from '../db/schemas/user.schema';
import { eq } from 'drizzle-orm';
import { InsertUser, SelectUser } from '../db/types/user.type';
import { LoggerService } from '../logger/logger.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UserService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {}

  async findByEmail(email: string): Promise<SelectUser | null> {
    try {
      const cachedId = await this.findCachedIdByEmail(email);

      if (cachedId) {
        const cachedUser = await this.findCachedUserById(cachedId);

        if (cachedUser) {
          const user = { ...cachedUser, id: Number(cachedId) };

          this.logger.log(`Info about user with ${email} was found in cache`);

          if (user.createdAt && typeof user.createdAt === 'string') {
            user.createdAt = new Date(user.createdAt);
          }

          return user;
        }
      }

      const [user] = await Db.select()
        .from(users)
        .where(eq(users.email, email));

      if (user) {
        this.logger.log(`User with e-mail ${email} info was found in database`);

        return user as SelectUser;
      }
    } catch (e) {
      this.logger.error('Error finding user by email', e);

      throw new HttpException(e, 503);
    }
    return null;
  }

  async create(
    userData: Omit<InsertUser, 'id' | 'createdAt'>,
  ): Promise<InsertUser> {
    try {
      const [user] = await Db.insert(users).values(userData).returning();

      await this.cacheCreated(userData, user.id);

      return user;
    } catch (e) {
      this.logger.error('Error creating user', e);

      throw new InternalServerErrorException(
        'Something went wrong, contact tech support',
      );
    }
  }

  async findByIdSafe(id: number): Promise<Partial<SelectUser> | null> {
    try {
      const cachedUser = await this.cacheService.get<Partial<SelectUser>>(
        id.toString(),
      );

      if (cachedUser) {
        this.logger.log(
          `User with mail ${cachedUser.email} info was found by id in cache`,
        );

        const { passwordSalt, passwordHash, ...safeUser } = cachedUser;

        return safeUser;
      }
      const [user] = await Db.select({
        email: users.email,
        fullName: users.fullName,
      })
        .from(users)
        .where(eq(users.id, id));

      if (user) {
        this.logger.log(
          `Info about user with ${id} was found by id in database`,
        );

        return user;
      }
    } catch (e) {
      this.logger.error('Error finding user by id', e);

      throw new HttpException(e, 504);
    }

    this.logger.log(`User with id ${id} does not exist`);
    throw new BadRequestException(`User with id ${id} does not exist`);
  }

  async cacheCreated(userData: InsertUser, id: number) {
    await this.cacheService.setMulti([
      { key: id.toString(), value: userData },
      { key: userData.email, value: id.toString() },
    ]);
  }

  async findCachedIdByEmail(email: string): Promise<string | false> {
    const id = await this.cacheService.get<string>(email);

    if (id) {
      this.logger.log(`User id with email ${email} was found in cache`);

      return id;
    }
    this.logger.log(`User id with e-mail ${email} was not found in cache`);

    return false;
  }

  async findCachedUserById(id: string): Promise<SelectUser | false> {
    const cachedUser = await this.cacheService.get<SelectUser>(id);

    if (cachedUser) {
      return cachedUser;
    }

    this.logger.log(`User with id ${id} was not found in cache`);

    return false;
  }
}
