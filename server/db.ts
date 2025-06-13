import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Use Supabase PostgreSQL database
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.lwydfwgzzanwtdebulmd:campaignnepal123@aws-0-us-east-2.pooler.supabase.com:6543/postgres";

if (databaseUrl) {
  console.log('Using Supabase database connection');
} else {
  console.log("DATABASE_URL not found, database operations may fail");
}

const connectionString = databaseUrl;
const isSupabase = databaseUrl?.includes('supabase.com');

export const pool = new Pool({ 
  connectionString: connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });