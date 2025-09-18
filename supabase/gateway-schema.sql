-- Gateway Model Schema - No Users Table
-- This schema removes the users table and simplifies RLS for Clerk integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verifier allowlist table (replaces user roles)
CREATE TABLE verifier_allowlist (
  clerk_id_hash TEXT PRIMARY KEY,
  added_by_clerk_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entries table (no user foreign key, direct clerk_user_id storage)
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer_summary TEXT,
  video_id TEXT NOT NULL,
  start_seconds INTEGER DEFAULT 0,
  submitted_by_clerk_id TEXT NOT NULL,
  verified_status TEXT DEFAULT 'pending' CHECK (verified_status IN ('pending', 'verified', 'rejected')),
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(question, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(answer_summary, '')), 'B')
  ) STORED
);

-- Create indexes for full-text search and common queries
CREATE INDEX entries_search_idx ON entries USING GIN (search_vector);
CREATE INDEX entries_video_id_idx ON entries(video_id);
CREATE INDEX entries_verified_status_idx ON entries(verified_status);
CREATE INDEX entries_submitted_by_idx ON entries(submitted_by_clerk_id);

-- Entry revisions table
CREATE TABLE entry_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  revised_by_clerk_id TEXT NOT NULL,
  changes_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats table (unchanged)
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

-- Bible verses table (unchanged)
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

-- Votes table (no user foreign key, direct clerk_user_id storage)
CREATE TABLE votes (
  clerk_user_id TEXT NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (clerk_user_id, entry_id)
);

-- Rate limiting tracking table
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT,
  ip_hash TEXT,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX rate_limits_user_idx ON rate_limits(clerk_user_id, action_type, created_at);
CREATE INDEX rate_limits_ip_idx ON rate_limits(ip_hash, action_type, created_at);

-- Function to calculate weighted votes (updated for Gateway Model)
CREATE OR REPLACE FUNCTION calculate_weighted_score(entry_id_param UUID)
RETURNS TABLE(upvotes BIGINT, downvotes BIGINT, weighted_score NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE v.vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE v.vote_type = 'downvote') as downvotes,
    SUM(
      CASE
        -- Check if user is in verifier allowlist
        WHEN v.vote_type = 'upvote' AND EXISTS (
          SELECT 1 FROM verifier_allowlist
          WHERE clerk_id_hash = encode(sha256(v.clerk_user_id::bytea), 'hex')
        ) THEN 3
        WHEN v.vote_type = 'upvote' THEN 1
        WHEN v.vote_type = 'downvote' AND EXISTS (
          SELECT 1 FROM verifier_allowlist
          WHERE clerk_id_hash = encode(sha256(v.clerk_user_id::bytea), 'hex')
        ) THEN -3
        WHEN v.vote_type = 'downvote' THEN -1
        ELSE 0
      END
    )::NUMERIC as weighted_score
  FROM votes v
  WHERE v.entry_id = entry_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function for rate limiting by clerk user
CREATE OR REPLACE FUNCTION check_rate_limit_user(clerk_user_id_param TEXT, action_type_param TEXT, limit_count INTEGER, time_window INTERVAL)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
BEGIN
  -- Count recent actions by this clerk user
  SELECT COUNT(*) INTO action_count
  FROM rate_limits
  WHERE clerk_user_id = clerk_user_id_param
    AND action_type = action_type_param
    AND created_at > NOW() - time_window;

  RETURN action_count < limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function for rate limiting by IP
CREATE OR REPLACE FUNCTION check_rate_limit_ip(ip_hash_param TEXT, action_type_param TEXT, limit_count INTEGER, time_window INTERVAL)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
BEGIN
  -- Count recent actions from this IP
  SELECT COUNT(*) INTO action_count
  FROM rate_limits
  WHERE ip_hash = ip_hash_param
    AND action_type = action_type_param
    AND created_at > NOW() - time_window;

  RETURN action_count < limit_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if user is verifier
CREATE OR REPLACE FUNCTION is_verifier(clerk_user_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM verifier_allowlist
    WHERE clerk_id_hash = encode(sha256(clerk_user_id_param::bytea), 'hex')
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (Gateway Model: Public reads, API-only writes)
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_bible_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifier_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (gateway model)
CREATE POLICY "public_read_entries" ON entries FOR SELECT USING (true);
CREATE POLICY "public_read_entry_revisions" ON entry_revisions FOR SELECT USING (true);
CREATE POLICY "public_read_stats" ON stats FOR SELECT USING (true);
CREATE POLICY "public_read_entry_stats" ON entry_stats FOR SELECT USING (true);
CREATE POLICY "public_read_bible_verses" ON bible_verses FOR SELECT USING (true);
CREATE POLICY "public_read_entry_bible_verses" ON entry_bible_verses FOR SELECT USING (true);
CREATE POLICY "public_read_votes" ON votes FOR SELECT USING (true);
CREATE POLICY "public_read_verifier_allowlist" ON verifier_allowlist FOR SELECT USING (true);
CREATE POLICY "public_read_rate_limits" ON rate_limits FOR SELECT USING (true);

-- No write policies - all writes go through API with service role
-- Service role automatically bypasses RLS

-- Insert initial verifier (replace with your Clerk user ID hash)
-- To add yourself as a verifier, run:
-- INSERT INTO verifier_allowlist (clerk_id_hash, added_by_clerk_id)
-- VALUES (encode(sha256('your_clerk_user_id'::bytea), 'hex'), 'system');