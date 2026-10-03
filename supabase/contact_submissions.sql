-- Supabase RLS policy for contact_submissions table
-- Apply this SQL in your Supabase SQL editor for the MindMesh project

-- Enable RLS on the table
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (safe to run multiple times)
DROP POLICY IF EXISTS "anon insert only" ON contact_submissions;
DROP POLICY IF EXISTS "auth select all" ON contact_submissions;
DROP POLICY IF EXISTS "auth delete own" ON contact_submissions;

-- Insert-only policy for anonymous (public) users
-- The publishable key has the 'anon' role, so this allows contact form submissions
CREATE POLICY "anon insert only" ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Optional: if you have authenticated admin users, allow them to read all
-- CREATE POLICY "auth select all" ON contact_submissions
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Optional: allow authenticated users to delete their own submissions
-- CREATE POLICY "auth delete own" ON contact_submissions
--   FOR DELETE
--   TO authenticated
--   USING (auth.uid() = user_id);

-- Database-level constraints to harden the table (apply after table creation)
-- These prevent oversized/abusive inserts even if RLS is misconfigured
ALTER TABLE contact_submissions
  ALTER COLUMN message SET DATA TYPE TEXT,
  ADD CONSTRAINT message_length CHECK (char_length(message) BETWEEN 10 AND 5000),
  ADD CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT name_length CHECK (char_length(name) BETWEEN 1 AND 200);