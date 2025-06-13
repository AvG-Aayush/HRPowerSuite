import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use PostgreSQL database
const databaseUrl = process.env.DATABASE_URL;
console.log(`Environment check - DATABASE_URL exists: ${!!databaseUrl}`);

if (!databaseUrl) {
  console.error("Available environment variables:", Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('PG')));
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

console.log("Connecting to PostgreSQL database...");
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });