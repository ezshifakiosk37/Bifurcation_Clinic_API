import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from .env file');
}

export default defineConfig({
  schema: './src/db/schema.ts', // Path to your schema file
  out: './drizzle',            // Where migration files will be stored
  dialect: 'postgresql',       // We are using Postgres
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});