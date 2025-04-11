import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
dotenv.config();

console.log('Initializing database connection...');

// Variable to track if we're using fallback storage
let usingFallbackStorage = false;

// Function to check if we're using fallback storage
export function isFallbackStorage(): boolean {
  return usingFallbackStorage;
}

// Check for DATABASE_URL and fall back to individual connection params if needed
if (!process.env.DATABASE_URL && process.env.PGHOST) {
  // Construct DATABASE_URL from individual params
  const pgUser = process.env.PGUSER || 'postgres';
  const pgPassword = process.env.PGPASSWORD ? encodeURIComponent(process.env.PGPASSWORD) : '';
  const pgHost = process.env.PGHOST;
  const pgPort = process.env.PGPORT || '5432';
  const pgDatabase = process.env.PGDATABASE || 'postgres';
  
  // Format: postgres://user:password@host:port/database
  process.env.DATABASE_URL = `postgres://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
  console.log('Constructed DATABASE_URL from individual connection parameters');
}

// Still verify DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  usingFallbackStorage = true;
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

// Configure connection options
const connectionOptions = {
  ssl: {
    rejectUnauthorized: false // Less secure but more compatible with various Postgres providers
  },
  max: 10, // Connection pool size
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 15, // Increased connection timeout for better reliability
  onnotice: () => {}, // Ignore notice messages
};

// PostgreSQL connection for Drizzle ORM
let sql: any;
let db: any;

try {
  // Try to connect with the options
  sql = postgres(process.env.DATABASE_URL, connectionOptions);
  db = drizzle(sql, { schema });
  
  // Test the connection
  sql`SELECT 1`.then(() => {
    console.log('✅ Database connection established successfully!');
  }).catch((error: any) => {
    console.error('❌ Database connection test failed:', error);
    usingFallbackStorage = true;
  });
} catch (error) {
  console.error('Failed to connect to the database:', error);
  console.log('The application will continue in fallback mode with in-memory storage');
  usingFallbackStorage = true;
}

export { sql, db };
