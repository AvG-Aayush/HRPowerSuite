import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()

// Use PostgreSQL database
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

console.log("Connecting to PostgreSQL database...");
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });