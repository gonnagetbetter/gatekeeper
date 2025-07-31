import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { LoggerService } from '../logger/logger.service';
import { Redis } from 'ioredis';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: Partial<Redis>;
  let mockLogger: Partial<LoggerService>;

  beforeEach(async () => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      multi: jest.fn(),
      ttl: jest.fn(),
      expire: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    (mockRedis.multi as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return null when key is not found in cache', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      const result = await service.get('nonexistent-key');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('nonexistent-key');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Data with key nonexistent-key was not found in cache',
      );
    });

    it('should return parsed data and prolong TTL when key is found in cache', async () => {
      const mockData = { id: 1, name: 'Test' };
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

      const result = await service.get('existing-key');

      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith('existing-key');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Data with key existing-key was found in cache',
      );
    });

    it('should handle errors and return null', async () => {
      (mockRedis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('error-key');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting data from cache with key error-key',
        expect.any(Error),
      );
    });
  });

  describe('set', () => {
    it('should set data in cache with default expiration', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        60 * 60 * 24,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Data with key ${key} was cached successfully`,
      );
    });

    it('should set data in cache with custom expiration', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };
      const expiration = 3600;

      await service.set(key, value, expiration);

      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        expiration,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Data with key ${key} was cached successfully`,
      );
    });

    it('should handle errors', async () => {
      const key = 'error-key';
      const value = { id: 1, name: 'Test' };
      (mockRedis.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
        'EX',
        60 * 60 * 24,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error caching data with key ${key}`,
        expect.any(Error),
      );
    });
  });

  describe('setMulti', () => {
    it('should set multiple key-value pairs in cache', async () => {
      const keyValuePairs = [
        { key: 'key1', value: { id: 1, name: 'Test1' } },
        { key: 'key2', value: { id: 2, name: 'Test2' } },
      ];

      await service.setMulti(keyValuePairs);

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Multiple keys were cached successfully',
      );
    });

    it('should handle string values correctly', async () => {
      const keyValuePairs = [
        { key: 'key1', value: 'string-value' },
        { key: 'key2', value: { id: 2, name: 'Test2' } },
      ];

      await service.setMulti(keyValuePairs);

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Multiple keys were cached successfully',
      );
    });

    it('should handle errors', async () => {
      const keyValuePairs = [{ key: 'key1', value: { id: 1, name: 'Test1' } }];

      const mockMulti = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error')),
      };

      (mockRedis.multi as jest.Mock).mockReturnValue(mockMulti);

      await service.setMulti(keyValuePairs);

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error caching multiple keys',
        expect.any(Error),
      );
    });
  });

  describe('prolongKeyTtl', () => {
    it('should not update TTL if current TTL is greater than requested', async () => {
      (mockRedis.ttl as jest.Mock).mockResolvedValue(60 * 60 * 7);

      await service.prolongKeyTtl('test-key');

      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should update TTL if current TTL is less than requested', async () => {
      (mockRedis.ttl as jest.Mock).mockResolvedValue(60 * 60 * 2);

      await service.prolongKeyTtl('test-key');

      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
      expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 60 * 60 * 6);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'TTL with key test-key was set to 6 hours',
      );
    });

    it('should handle errors', async () => {
      (mockRedis.ttl as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await service.prolongKeyTtl('error-key');

      expect(mockRedis.ttl).toHaveBeenCalledWith('error-key');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error prolonging error-key TTL',
        expect.any(Error),
      );
    });
  });
});
