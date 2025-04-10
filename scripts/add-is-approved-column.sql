-- Add is_approved column to notes table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'is_approved'
  ) THEN
    ALTER TABLE notes ADD COLUMN is_approved BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Update any existing NULL values to TRUE
UPDATE notes SET is_approved = TRUE WHERE is_approved IS NULL;