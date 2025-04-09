import { createClient } from '@supabase/supabase-js';
import { sql } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Check for required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create a PostgreSQL client
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function main() {
  console.log("Starting database migration to remove dark_mode column...");
  
  try {
    // First check if the column exists
    const checkColumnSql = sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'dark_mode'
      );
    `;
    
    const result = await db.execute(checkColumnSql);
    // Cast result to any to avoid TypeScript errors with drizzle's typings
    const resultAny = result as any;
    const exists = resultAny.rows && resultAny.rows[0] && resultAny.rows[0].exists === true;
    
    if (exists) {
      // Remove the dark_mode column
      await db.execute(sql`
        ALTER TABLE "users" DROP COLUMN IF EXISTS "dark_mode";
      `);
      console.log("dark_mode column removed successfully");
    } else {
      console.log("dark_mode column does not exist, no action needed");
    }
    
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await client.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await client.end();
    process.exit(1);
  });