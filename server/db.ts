import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use PostgreSQL database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.error("DATABASE_URL is missing or empty");
  console.error("You need to set the DATABASE_URL environment variable with your PostgreSQL connection string");
  console.error("Format: postgresql://username:password@host:port/database");
  process.exit(1);
}

const isSupabase = databaseUrl.includes('supabase.com');
const isNeon = databaseUrl.includes('neon.tech');
const isReplit = databaseUrl.includes('replit') || databaseUrl.includes('localhost');

if (isSupabase) {
  console.log('Connecting to Supabase database...');
} else if (isNeon) {
  console.log('Connecting to Neon database...');
} else if (isReplit) {
  console.log('Connecting to Replit PostgreSQL database...');
} else {
  console.log('Connecting to PostgreSQL database...');
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: (isSupabase || isNeon) ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });