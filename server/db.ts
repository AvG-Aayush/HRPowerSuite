import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use Supabase database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.error("DATABASE_URL is missing or empty");
  console.error("You need to set the DATABASE_URL environment variable with your Supabase connection string");
  console.error("Format: postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres");
  process.exit(1);
}

console.log("Connecting to Supabase database...");

const isSupabase = databaseUrl.includes('supabase.com');
console.log(`Connecting to ${isSupabase ? 'Supabase' : 'PostgreSQL'} database...`);
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : (databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false)
});
export const db = drizzle(pool, { schema });