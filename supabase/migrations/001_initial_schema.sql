-- ============================================================
-- Rybářský deník — Initial Schema
-- Run this in Supabase SQL Editor (project > SQL Editor > New query)
-- ============================================================

-- Enums
CREATE TYPE event_mode AS ENUM ('individual', 'teams');

CREATE TYPE fish_species AS ENUM (
  'Kapr', 'Štika', 'Candát', 'Sumec', 'Amur', 'Tolstolobik',
  'Okoun', 'Cejn', 'Lín', 'Pstruh duhový', 'Pstruh obecný',
  'Lipan', 'Bolen', 'Plotice', 'Jiné'
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  mode event_mode NOT NULL DEFAULT 'individual',
  invite_code CHAR(6) NOT NULL UNIQUE,
  master_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams (only used when event mode = 'teams')
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, name)
);

-- Event participants
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Catches
CREATE TABLE catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  species fish_species NOT NULL,
  weight_kg DECIMAL(6,3) NOT NULL CHECK (weight_kg > 0),
  length_cm INTEGER CHECK (length_cm > 0),
  photo_url TEXT,
  note TEXT,
  caught_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_invite_code ON events(invite_code);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_catches_event_id ON catches(event_id);
CREATE INDEX idx_catches_user_id ON catches(user_id);
CREATE INDEX idx_catches_caught_at ON catches(caught_at DESC);

-- Auto-update updated_at on catches
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catches_updated_at
  BEFORE UPDATE ON catches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- EVENTS — anyone authenticated can read; only creator can update/delete
CREATE POLICY "events_select_all" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert_auth" ON events FOR INSERT WITH CHECK (auth.uid() = master_user_id);
CREATE POLICY "events_update_master" ON events FOR UPDATE USING (auth.uid() = master_user_id);
CREATE POLICY "events_delete_master" ON events FOR DELETE USING (auth.uid() = master_user_id);

-- TEAMS
CREATE POLICY "teams_select_all" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_participant" ON teams FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM event_participants WHERE event_id = teams.event_id
  ) OR
  auth.uid() IN (
    SELECT master_user_id FROM events WHERE id = teams.event_id
  )
);
CREATE POLICY "teams_delete_master" ON teams FOR DELETE USING (
  auth.uid() IN (SELECT master_user_id FROM events WHERE id = teams.event_id)
);

-- EVENT_PARTICIPANTS
CREATE POLICY "ep_select_all" ON event_participants FOR SELECT USING (true);
CREATE POLICY "ep_insert_self" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ep_update_self_or_master" ON event_participants FOR UPDATE USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT master_user_id FROM events WHERE id = event_participants.event_id)
);
CREATE POLICY "ep_delete_master" ON event_participants FOR DELETE USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT master_user_id FROM events WHERE id = event_participants.event_id)
);

-- CATCHES
CREATE POLICY "catches_select_all" ON catches FOR SELECT USING (true);

CREATE POLICY "catches_insert_participant" ON catches FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  auth.uid() IN (
    SELECT user_id FROM event_participants WHERE event_id = catches.event_id
  ) AND
  EXISTS (
    SELECT 1 FROM events
    WHERE id = catches.event_id
      AND NOW() BETWEEN starts_at AND ends_at
  )
);

CREATE POLICY "catches_update_own_or_master" ON catches FOR UPDATE USING (
  -- Own catch during active event
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM events WHERE id = catches.event_id AND NOW() BETWEEN starts_at AND ends_at
  ))
  OR
  -- Master can always edit
  auth.uid() IN (SELECT master_user_id FROM events WHERE id = catches.event_id)
);

CREATE POLICY "catches_delete_master" ON catches FOR DELETE USING (
  auth.uid() IN (SELECT master_user_id FROM events WHERE id = catches.event_id)
);

-- ============================================================
-- Storage bucket: catch-photos
-- ============================================================

-- Run these in Supabase Dashboard > Storage > New Bucket: "catch-photos" (public)
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('catch-photos', 'catch-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "catch_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'catch-photos');

CREATE POLICY "catch_photos_auth_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'catch-photos' AND auth.role() = 'authenticated');

CREATE POLICY "catch_photos_own_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'catch-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- Enable Realtime on catches table
-- ============================================================
-- In Supabase Dashboard > Database > Replication > enable catches table
-- Or:
ALTER PUBLICATION supabase_realtime ADD TABLE catches;
