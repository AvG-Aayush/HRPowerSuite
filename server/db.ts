import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config()
// Configure WebSocket for server environment
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const databaseUrl = process.env.DATABASE_URL || process.env.REPLIT_DB_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });