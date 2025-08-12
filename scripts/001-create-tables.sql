-- Create users table (Supabase Auth handles this, but we need a profile table)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'checked-in')),
  invitation_token UUID DEFAULT gen_random_uuid(),
  qr_code_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, email)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Note: Profile insertion is handled by the trigger, so no INSERT policy needed

CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Users can view participants of their events" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = participants.event_id 
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage participants of their events" ON participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = participants.event_id 
      AND events.created_by = auth.uid()
    )
  );

-- Allow public access to participants for invitation viewing
CREATE POLICY "Public can view participants by token" ON participants
  FOR SELECT USING (true);

-- Allow public access to events for invitation viewing
CREATE POLICY "Public can view events for invitations" ON events
  FOR SELECT USING (true);
