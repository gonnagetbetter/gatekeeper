import { Injectable } from '@nestjs/common';
import winston from 'winston';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      exitOnError: false,
      transports: [
        new winston.transports.Console({
          level: 'info',
          format: winston.format.simple(),
        }),
        new winston.transports.File({
          filename: 'error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace?: any) {
    this.logger.error(`${message} - ${trace || 'No trace'}`);
  }
}
