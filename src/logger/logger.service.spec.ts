import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';
import * as winston from 'winston';

jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };
  return {
    createLogger: jest.fn().mockReturnValue(mockLogger),
    format: {
      simple: jest.fn(),
      timestamp: jest.fn(),
      json: jest.fn(),
      combine: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

describe('LoggerService', () => {
  let service: LoggerService;
  let mockWinstonLogger: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    mockWinstonLogger = (winston.createLogger as jest.Mock).mock.results[0]
      .value;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a winston logger with correct configuration', () => {
    expect(winston.createLogger).toHaveBeenCalledWith({
      exitOnError: false,
      transports: expect.any(Array),
    });
    expect(winston.transports.Console).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
      }),
    );
    expect(winston.transports.File).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'error.log',
        level: 'error',
      }),
    );
  });

  describe('log', () => {
    it('should call winston logger info method with the provided message', () => {
      const message = 'Test log message';
      service.log(message);
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message);
    });
  });

  describe('error', () => {
    it('should call winston logger error method with the provided message', () => {
      const message = 'Test error message';
      service.error(message);
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        `${message} - No trace`,
      );
    });

    it('should include trace in the error message when provided', () => {
      const message = 'Test error message';
      const trace = 'Error trace';
      service.error(message, trace);
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        `${message} - ${trace}`,
      );
    });
  });
});
