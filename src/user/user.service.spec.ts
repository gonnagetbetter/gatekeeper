import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { CacheService } from '../cache/cache.service';
import { LoggerService } from '../logger/logger.service';
import { BadRequestException } from '@nestjs/common';
import { Db } from '../db/db.connect';

jest.mock('../db/db.connect', () => {
  const mockDbInstance = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };
  return {
    Db: mockDbInstance,
  };
});

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

const mockDb = jest.requireMock('../db/db.connect').Db;

describe('UserService', () => {
  let service: UserService;
  let cacheService: jest.Mocked<Partial<CacheService>>;
  let loggerService: jest.Mocked<Partial<LoggerService>>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    passwordHash: 'hashedPassword',
    passwordSalt: 'salt',
    createdAt: new Date(),
  };

  const mockUserSafe = {
    email: 'test@example.com',
    fullName: 'Test User',
  };

  beforeEach(async () => {
    Object.values(mockDb).forEach((mock: any) => mock.mockClear());

    cacheService = {
      get: jest.fn<Promise<any>, [string]>().mockResolvedValue(null),
      set: jest
        .fn<Promise<void>, [string, any, number?]>()
        .mockResolvedValue(undefined),
      setMulti: jest
        .fn<Promise<void>, [{ key: string; value: any }[], number?]>()
        .mockResolvedValue(undefined),
      prolongKeyTtl: jest
        .fn<Promise<void>, [string, number?]>()
        .mockResolvedValue(undefined),
    } as jest.Mocked<Partial<CacheService>>;

    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user from cache if available', async () => {
      jest.spyOn(service, 'findCachedIdByEmail').mockResolvedValue('1');
      jest.spyOn(service, 'findCachedUserById').mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(service.findCachedIdByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(service.findCachedUserById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
      expect(loggerService.log).toHaveBeenCalledWith(
        'Info about user with test@example.com was found in cache',
      );
    });

    it('should query database if user id not in cache', async () => {
      jest.spyOn(service, 'findCachedIdByEmail').mockResolvedValue(false);
      mockDb.where.mockReturnValue([mockUser]);

      const result = await service.findByEmail('test@example.com');

      expect(service.findCachedIdByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(mockUser);
      expect(loggerService.log).toHaveBeenCalledWith(
        'User with e-mail test@example.com info was found in database',
      );
    });

    it('should query database if user id in cache but user not in cache', async () => {
      jest.spyOn(service, 'findCachedIdByEmail').mockResolvedValue('1');
      jest.spyOn(service, 'findCachedUserById').mockResolvedValue(false);
      mockDb.where.mockReturnValue([mockUser]);

      const result = await service.findByEmail('test@example.com');

      expect(service.findCachedIdByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(service.findCachedUserById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
      expect(loggerService.log).toHaveBeenCalledWith(
        'User with e-mail test@example.com info was found in database',
      );
    });

    it('should return null if user not found', async () => {
      jest.spyOn(service, 'findCachedIdByEmail').mockResolvedValue(false);
      mockDb.where.mockReturnValue([]);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      jest.spyOn(service, 'findCachedIdByEmail').mockResolvedValue(false);
      jest.spyOn(Db, 'select').mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeNull();
      expect(loggerService.error).toHaveBeenCalledWith(
        'Error finding user by email',
        expect.any(Error),
      );
    });
  });

  describe('create', () => {
    it('should create a user and cache it', async () => {
      const userData = {
        email: 'new@example.com',
        fullName: 'New User',
        passwordHash: 'hash',
        passwordSalt: 'salt',
      };

      mockDb.returning.mockResolvedValue([{ ...userData, id: 2 }]);
      jest.spyOn(service, 'cacheCreated').mockResolvedValue(undefined);

      const result = await service.create(userData);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(service.cacheCreated).toHaveBeenCalled();
      expect(result).toEqual({ ...userData, id: 2 });
    });

    it('should handle errors', async () => {
      const userData = {
        email: 'new@example.com',
        fullName: 'New User',
        passwordHash: 'hash',
        passwordSalt: 'salt',
      };

      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.create(userData)).rejects.toThrow(
        'Something went wrong, contact tech support',
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        'Error creating user',
        expect.any(Error),
      );
    });
  });

  describe('findByIdSafe', () => {
    it('should return user from cache if available', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(mockUserSafe);

      const result = await service.findByIdSafe(1);

      expect(cacheService.get).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUserSafe);
      expect(loggerService.log).toHaveBeenCalledWith(
        `User with mail ${mockUserSafe.email} info was found by id in cache`,
      );
    });

    it('should query database if user not in cache', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([mockUserSafe]);

      const result = await service.findByIdSafe(1);

      expect(cacheService.get).toHaveBeenCalledWith('1');
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockUserSafe);
      expect(loggerService.log).toHaveBeenCalledWith(
        'Info about user with 1 was found by id in database',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      mockDb.where.mockReturnValue([]);

      await expect(service.findByIdSafe(999)).rejects.toThrow(
        BadRequestException,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        'User with id 999 does not exist',
      );
    });

    it('should handle errors in database query', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.findByIdSafe(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        'Error finding user by id',
        expect.any(Error),
      );
    });

    it('should handle errors in cache service', async () => {
      (cacheService.get as jest.Mock).mockRejectedValueOnce(
        new Error('Cache error'),
      );

      await expect(service.findByIdSafe(1)).rejects.toThrow(
        BadRequestException,
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        'Error finding user by id',
        expect.any(Error),
      );
    });
  });

  describe('cacheCreated', () => {
    it('should call setMulti with correct parameters', async () => {
      const userData = { ...mockUser };

      await service.cacheCreated(userData, 1);

      expect(cacheService.setMulti).toHaveBeenCalledWith([
        { key: '1', value: userData },
        { key: userData.email, value: '1' },
      ]);
    });
  });

  describe('findCachedIdByEmail', () => {
    it('should return cached user id if found', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce('1');

      const result = await service.findCachedIdByEmail('test@example.com');

      expect(cacheService.get).toHaveBeenCalledWith('test@example.com');
      expect(result).toBe('1');
      expect(loggerService.log).toHaveBeenCalledWith(
        'User id with email test@example.com was found in cache',
      );
    });

    it('should return false if user id not found in cache', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findCachedIdByEmail(
        'nonexistent@example.com',
      );

      expect(cacheService.get).toHaveBeenCalledWith('nonexistent@example.com');
      expect(result).toBe(false);
      expect(loggerService.log).toHaveBeenCalledWith(
        'User id with e-mail nonexistent@example.com was not found in cache',
      );
    });
  });

  describe('findCachedUserById', () => {
    it('should return cached user data if found', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.findCachedUserById('1');

      expect(cacheService.get).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });

    it('should return false if user data not found in cache', async () => {
      (cacheService.get as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findCachedUserById('999');

      expect(cacheService.get).toHaveBeenCalledWith('999');
      expect(result).toBe(false);
      expect(loggerService.log).toHaveBeenCalledWith(
        'User with id 999 was not found in cache',
      );
    });
  });
});
