import { config as envConfig } from 'dotenv';

envConfig();

export const config = {
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT ?? 3000,
};
