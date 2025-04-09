#!/bin/bash

# Check for required environment variables
echo "Checking environment variables..."

# Database URL is required
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set. Please set this environment variable."
  echo "You can create a .env file based on the .env.example template."
  exit 1
fi

# Check PostgreSQL individual environment variables
if [ -z "$PGHOST" ] || [ -z "$PGPORT" ] || [ -z "$PGUSER" ] || [ -z "$PGPASSWORD" ] || [ -z "$PGDATABASE" ]; then
  echo "Warning: One or more PostgreSQL environment variables are missing."
  echo "Required: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE"
  echo "Using DATABASE_URL as fallback."
fi

echo "Environment check passed! Starting application..."
exit 0