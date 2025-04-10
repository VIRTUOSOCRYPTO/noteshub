#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script executes the SQL migration to add the is_approved column to the notes table.
 * It's designed to work with the Supabase database provided via DATABASE_URL.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Database URL is required
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    console.error('Please set it to your Supabase connection string.');
    process.exit(1);
  }

  console.log('Starting database migration...');

  // Create a database connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for some Supabase connections
    }
  });

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'add-is-approved-column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Connect to the database
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Run the migration
      console.log('Executing migration SQL...');
      await client.query(sql);
      console.log('Migration completed successfully!');
      
      // Verify the column was added
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'is_approved'
      `);
      
      if (result.rows.length > 0) {
        console.log(`✓ Column 'is_approved' exists with type: ${result.rows[0].data_type}`);
      } else {
        console.log('⚠️ Column was not created. Check for errors in the migration SQL.');
      }
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error executing migration:', error);
    process.exit(1);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the migration
main()
  .then(() => {
    console.log('Migration script completed.');
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });