import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use Supabase database with fallback
const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
console.log(`Environment check - Using database URL: ${databaseUrl ? 'configured' : 'missing'}`);

if (!databaseUrl) {
  console.error("Available environment variables:", Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('PG')));
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?");
}

const isSupabase = databaseUrl.includes('supabase.com');
console.log(`Connecting to ${isSupabase ? 'Supabase' : 'PostgreSQL'} database...`);
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : (databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false)
});
export const db = drizzle(pool, { schema });