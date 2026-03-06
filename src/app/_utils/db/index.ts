// src/db/client.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// neon() returns a connection object wrapping the connection string
const sql = neon(process.env.DATABASE_URL!);

// db is your Drizzle instance
export const db = drizzle(sql);
