-- Alternative approach: Use auth.users directly instead of profiles table for events
-- This avoids the foreign key constraint issue entirely

-- Drop existing constraints and recreate with proper references
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;

-- Add the foreign key constraint to reference auth.users directly
ALTER TABLE events 
ADD CONSTRAINT events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to work with auth.users
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = created_by);

-- Keep the profiles table for additional user data, but don't make it required for events
-- The trigger will still create profiles, but events can be created even if profile creation fails
