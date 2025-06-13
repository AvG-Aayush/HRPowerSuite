import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use the PostgreSQL database provided by Replit
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  console.log('Using provided DATABASE_URL');
} else {
  console.log("DATABASE_URL not found, database operations may fail");
}

const connectionString = databaseUrl;

export const pool = new Pool({ 
  connectionString: connectionString,
  ssl: false
});
export const db = drizzle(pool, { schema });