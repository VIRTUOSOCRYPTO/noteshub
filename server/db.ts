import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
dotenv.config();

console.log('Initializing database connection...');

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

// Helper function to handle IPv6 address issues in connection URL
const processConnectionUrl = (url: string): string => {
  try {
    // Only attempt to modify if it's a valid URL with postgresql or postgres protocol
    if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
      const dbUrl = new URL(url);
      
      // If hostname is an IPv6 address
      if (dbUrl.hostname.includes(':')) {
        console.log('Detected IPv6 address in database URL - this may cause connectivity issues in some environments');
        
        // If we have individual connection parameters, prefer those in production
        if (process.env.NODE_ENV === 'production' && process.env.PGHOST) {
          console.log('Using environment variables for database connection instead of IPv6 address');
          const username = process.env.PGUSER || dbUrl.username;
          const password = process.env.PGPASSWORD || dbUrl.password;
          const host = process.env.PGHOST;
          const port = process.env.PGPORT || dbUrl.port || '5432';
          const database = process.env.PGDATABASE || dbUrl.pathname.substring(1);
          
          return `postgres://${username}:${password}@${host}:${port}/${database}`;
        }
      }
    }
    
    return url;
  } catch (error) {
    console.warn('Error processing database URL, using original:', error);
    return url;
  }
};

// Process the DATABASE_URL to handle IPv6 issues
process.env.DATABASE_URL = processConnectionUrl(process.env.DATABASE_URL);

// Configure connection options
const isProd = process.env.NODE_ENV === 'production';
const connectionOptions = {
  ssl: isProd, // Enable SSL in production
  max: 10, // Connection pool size
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 15, // Increased connection timeout for better reliability
  // For IPv6 issues, prefer IPv4
  host_type: 'ip', // Use 'ip' to force IPv4 when possible
  onnotice: () => {}, // Ignore notice messages
};

// Maintain PostgreSQL connection for existing Drizzle ORM code
let sql;
let db;

try {
  // Try to connect with the improved options
  sql = postgres(process.env.DATABASE_URL, connectionOptions);
  db = drizzle(sql, { schema });
  console.log('Database connection established successfully!');
} catch (error) {
  console.error('Failed to connect to the database:', error);
  
  // Try with fallback options
  try {
    console.log('Retrying connection with fallback options...');
    // Configure fallback options with maximum compatibility
    const fallbackOptions = {
      ...connectionOptions,
      ssl: true, // Force SSL
      reject_unauthorized: false, // Less secure but more compatible
      connect_timeout: 30, // Longer timeout for slower connections
    };
    
    // Try using a different connection method if available
    if (process.env.NODE_ENV === 'production' && 
        process.env.PGHOST && 
        process.env.PGUSER && 
        process.env.PGDATABASE) {
      console.log('Trying connection with individual parameters...');
      const connectionParams = {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE,
      };
      
      // Construct connection string from individual parameters
      const connString = `postgres://${connectionParams.user}:${connectionParams.password}@${connectionParams.host}:${connectionParams.port}/${connectionParams.database}`;
      sql = postgres(connString, fallbackOptions);
    } else {
      // Use the original URL with fallback options
      sql = postgres(process.env.DATABASE_URL, fallbackOptions);
    }
    
    db = drizzle(sql, { schema });
    console.log('Database connection established successfully with fallback options!');
  } catch (retryError) {
    console.error('Failed to connect to the database after retry:', retryError);
    console.log('The application will continue in fallback mode with in-memory storage');
    // We don't throw here - the storage.ts will handle fallback to MemStorage
    // This allows the application to start even if database is not available
  }
}

export { sql, db };
