-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table (synced from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  roles TEXT[] DEFAULT ARRAY['contributor']::TEXT[],
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer_summary TEXT NOT NULL,
  video_id TEXT NOT NULL,
  start_seconds INTEGER DEFAULT 0,
  submitted_by UUID REFERENCES users(id),
  verified_status TEXT DEFAULT 'pending' CHECK (verified_status IN ('pending', 'verified', 'rejected')),
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(question, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(answer_summary, '')), 'B')
  ) STORED
);

-- Create index for full-text search
CREATE INDEX entries_search_idx ON entries USING GIN (search_vector);
CREATE INDEX entries_video_id_idx ON entries(video_id);
CREATE INDEX entries_verified_status_idx ON entries(verified_status);

-- Entry revisions table
CREATE TABLE entry_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  revised_by UUID REFERENCES users(id),
  changes_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats table
CREATE TABLE stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  source_url TEXT
);

-- Entry-stats junction table
CREATE TABLE entry_stats (
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  stat_id UUID REFERENCES stats(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, stat_id)
);

-- Bible verses table
CREATE TABLE bible_verses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  UNIQUE(book, chapter, verse)
);

-- Entry-bible verses junction table
CREATE TABLE entry_bible_verses (
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  verse_id UUID REFERENCES bible_verses(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, verse_id)
);

-- Votes table
CREATE TABLE votes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, entry_id)
);

-- Function to calculate weighted votes
CREATE OR REPLACE FUNCTION calculate_weighted_score(entry_id_param UUID)
RETURNS TABLE(upvotes BIGINT, downvotes BIGINT, weighted_score NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE v.vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE v.vote_type = 'downvote') as downvotes,
    SUM(
      CASE
        WHEN v.vote_type = 'upvote' AND 'verifier' = ANY(u.roles) THEN 3
        WHEN v.vote_type = 'upvote' THEN 1
        WHEN v.vote_type = 'downvote' AND 'verifier' = ANY(u.roles) THEN -3
        WHEN v.vote_type = 'downvote' THEN -1
        ELSE 0
      END
    )::NUMERIC as weighted_score
  FROM votes v
  JOIN users u ON v.user_id = u.id
  WHERE v.entry_id = entry_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function for rate limiting by user
CREATE OR REPLACE FUNCTION check_rate_limit_user(user_id_param UUID, action_type TEXT, limit_count INTEGER, time_window INTERVAL)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
BEGIN
  -- Count recent actions
  SELECT COUNT(*) INTO action_count
  FROM votes
  WHERE user_id = user_id_param
    AND created_at > NOW() - time_window;

  RETURN action_count < limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function for rate limiting by IP
CREATE OR REPLACE FUNCTION check_rate_limit_ip(ip_hash_param TEXT, limit_count INTEGER, time_window INTERVAL)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
BEGIN
  -- Count recent actions from this IP
  SELECT COUNT(*) INTO action_count
  FROM votes
  WHERE ip_hash = ip_hash_param
    AND created_at > NOW() - time_window;

  RETURN action_count < limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Only admins can modify users" ON users FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND 'admin' = ANY(roles)
  )
);

-- Entries policies
CREATE POLICY "Anyone can view verified entries" ON entries FOR SELECT
  USING (verified_status = 'verified' OR submitted_by = auth.uid());

CREATE POLICY "Contributors can create entries" ON entries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own unverified entries" ON entries FOR UPDATE
  USING (submitted_by = auth.uid() AND verified_status = 'pending')
  WITH CHECK (submitted_by = auth.uid() AND verified_status = 'pending');

CREATE POLICY "Verifiers can update any entry" ON entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND ('verifier' = ANY(roles) OR 'admin' = ANY(roles))
    )
  );

-- Votes policies
CREATE POLICY "Anyone can view votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own votes" ON votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own votes" ON votes FOR DELETE
  USING (user_id = auth.uid());

-- Other tables policies (simplified for brevity)
CREATE POLICY "Public read access" ON stats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON bible_verses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON entry_stats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON entry_bible_verses FOR SELECT USING (true);
CREATE POLICY "Public read access" ON entry_revisions FOR SELECT USING (true);