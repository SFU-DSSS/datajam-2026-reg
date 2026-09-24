-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  student_number TEXT NOT NULL,
  major TEXT NOT NULL,
  year TEXT NOT NULL,
  how_heard TEXT[] NOT NULL,
  kaggle_username TEXT NOT NULL,
  dietary_restrictions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  team_code TEXT NOT NULL UNIQUE,
  university TEXT NOT NULL,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create team_members table (junction table)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(team_id, participant_id)
);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participants
CREATE POLICY "Users can view their own participant data"
  ON participants FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own participant data"
  ON participants FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own participant data"
  ON participants FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for teams
CREATE POLICY "Anyone can view teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Team leaders can update their teams"
  ON teams FOR UPDATE
  USING (auth.uid() = leader_id);

CREATE POLICY "Team leaders can delete their teams"
  ON teams FOR DELETE
  USING (auth.uid() = leader_id);

-- RLS Policies for team_members
CREATE POLICY "Anyone can view team members"
  ON team_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join teams"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = participant_id);

CREATE POLICY "Users can leave teams"
  ON team_members FOR DELETE
  USING (auth.uid() = participant_id);

-- Function to generate unique team code
CREATE OR REPLACE FUNCTION generate_team_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
