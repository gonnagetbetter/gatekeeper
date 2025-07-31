import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  fullName: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  passwordHash: varchar('password_hash', { length: 256 }).notNull(),
  passwordSalt: varchar('password_salt', { length: 256 }).notNull(),
});
