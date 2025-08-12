-- Drop the existing foreign key constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;

-- Recreate the foreign key constraint with proper reference to auth.users
ALTER TABLE events 
ADD CONSTRAINT events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the trigger function to handle profile creation more robustly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to ensure profile exists before creating events
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  SELECT 
    auth.users.id,
    auth.users.email,
    COALESCE(auth.users.raw_user_meta_data->>'full_name', auth.users.email)
  FROM auth.users
  WHERE auth.users.id = user_id
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
