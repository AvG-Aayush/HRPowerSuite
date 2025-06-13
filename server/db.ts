import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use the PostgreSQL database provided by Replit
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim() === '') {
  console.log("DATABASE_URL not found, using default PostgreSQL connection");
  // Fallback to default PostgreSQL connection for Replit environment
  const defaultUrl = "postgresql://postgres:password@localhost:5432/postgres";
  console.log("Using default PostgreSQL connection");
} else {
  console.log('Using provided DATABASE_URL');
}

const connectionString = databaseUrl || "postgresql://postgres:password@localhost:5432/postgres";

export const pool = new Pool({ 
  connectionString: connectionString,
  ssl: false
});
export const db = drizzle(pool, { schema });