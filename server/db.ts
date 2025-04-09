import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from "../shared/schema";
import dotenv from 'dotenv';
dotenv.config();

console.log('Initializing database connection...');

// Maintain PostgreSQL connection for Drizzle ORM
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create Supabase client (if credentials are available)
export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  : null;

if (!supabase) {
  console.log('Supabase client not initialized. This is optional and the app will work without it.');
}

// Log the database connection attempt (but not the actual sensitive URL)
console.log('Attempting to connect to PostgreSQL database...');

// Maintain PostgreSQL connection for existing Drizzle ORM code
let sql: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

try {
  sql = postgres(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  console.log('Database connection established successfully!');
} catch (error) {
  console.error('Failed to connect to the database:', error);
  throw new Error('Database connection failed. Please check your DATABASE_URL and ensure the database is accessible.');
}

export { sql, db };
