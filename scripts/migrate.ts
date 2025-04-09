import { db } from "../server/db";
import { users, notes } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting database migration...");
  
  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "usn" TEXT NOT NULL UNIQUE,
        "department" TEXT NOT NULL,
        "college" TEXT,
        "password" TEXT NOT NULL,
        "profile_picture" TEXT,
        "notify_new_notes" BOOLEAN DEFAULT TRUE,
        "notify_downloads" BOOLEAN DEFAULT FALSE,
        "dark_mode" BOOLEAN DEFAULT FALSE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("Users table created successfully");
    
    // Create notes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "notes" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER REFERENCES "users"("id"),
        "usn" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "department" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "original_filename" TEXT NOT NULL,
        "uploaded_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "is_flagged" BOOLEAN DEFAULT FALSE,
        "flag_reason" TEXT,
        "reviewed_at" TIMESTAMP
      );
    `);
    console.log("Notes table created successfully");
    
    console.log("Database migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });