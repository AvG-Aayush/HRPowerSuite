import { Pool } from 'pg';

export interface DatabaseConfig {
  url: string;
  connectionString: string;
}

export interface AuthConfig {
  sessionSecret: string;
  tokenExpiry: number;
}

export interface AppConfig {
  database: DatabaseConfig;
  auth: AuthConfig;
  environment: 'development' | 'production';
  port: number;
}

function getRequiredEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    console.warn(`Required environment variable ${name} is not set, using fallback`);
    return fallback || '';
  }
  return value;
}

function getOptionalEnvVar(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export function createAppConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.trim() === '') {
    console.error("DATABASE_URL is missing or empty");
    console.error("You need to set the DATABASE_URL environment variable with your PostgreSQL connection string");
    console.error("Format: postgresql://username:password@host:port/database");
    throw new Error("DATABASE_URL environment variable is required");
  }
  
  return {
    database: {
      url: databaseUrl,
      connectionString: databaseUrl,
    },
    auth: {
      sessionSecret: getOptionalEnvVar('SESSION_SECRET', 'default-session-secret-for-development'),
      tokenExpiry: parseInt(getOptionalEnvVar('TOKEN_EXPIRY', '86400'), 10), // 24 hours
    },
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
    port: parseInt(getOptionalEnvVar('PORT', '5000'), 10),
  };
}

export async function validateDatabaseConnection(config: DatabaseConfig): Promise<boolean> {
  try {
    const pool = new Pool({ connectionString: config.connectionString });
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection validated successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}