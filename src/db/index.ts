import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

// 1. Create a persistent connection pool
// For Neon, use the connection string that ends with ?sslmode=require
const queryClient = postgres(process.env.DATABASE_URL, { max: 10 }); 

// 2. Initialize Drizzle with the schema for full Type Safety
export const db = drizzle(queryClient, { schema });