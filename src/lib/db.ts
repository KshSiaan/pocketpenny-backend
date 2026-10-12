import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set before initializing the database');
}

export const db = drizzle(databaseUrl);