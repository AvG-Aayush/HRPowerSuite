import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use Supabase PostgreSQL database
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.error("DATABASE_URL is missing or empty");
  console.error("You need to set the DATABASE_URL environment variable with your Supabase connection string");
  console.error("Format: postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres");
  process.exit(1);
}

const isSupabase = databaseUrl.includes('supabase.com');

if (isSupabase) {
  console.log('Connecting to Supabase database...');
} else {
  console.log('Connecting to PostgreSQL database...');
}

console.log(`Using database: ${isSupabase ? 'Supabase' : 'PostgreSQL'}`);

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });