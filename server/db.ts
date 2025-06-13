import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use Supabase database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.error("DATABASE_URL is not properly configured");
  console.error("Please provide a valid Supabase connection string in the DATABASE_URL environment variable");
  console.error("Format: postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres");
  throw new Error("DATABASE_URL must be set with a valid Supabase connection string");
}

console.log("Connecting to Supabase database...");

const isSupabase = databaseUrl.includes('supabase.com');
console.log(`Connecting to ${isSupabase ? 'Supabase' : 'PostgreSQL'} database...`);
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : (databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false)
});
export const db = drizzle(pool, { schema });