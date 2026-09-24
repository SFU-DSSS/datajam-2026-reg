-- Remove tshirt_size column from participants table
-- This column is no longer needed in the registration form

ALTER TABLE participants DROP COLUMN IF EXISTS tshirt_size;
