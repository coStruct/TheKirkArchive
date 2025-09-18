-- Complete Database Cleanup for Gateway Model Migration
-- Run this FIRST to remove all existing tables and functions

-- Drop all existing tables in the correct order (to handle foreign key constraints)
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS entry_bible_verses CASCADE;
DROP TABLE IF EXISTS entry_stats CASCADE;
DROP TABLE IF EXISTS entry_revisions CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS bible_verses CASCADE;
DROP TABLE IF EXISTS stats CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS verifier_allowlist CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS calculate_weighted_score(UUID);
DROP FUNCTION IF EXISTS check_rate_limit_user(UUID, TEXT, INTEGER, INTERVAL);
DROP FUNCTION IF EXISTS check_rate_limit_ip(TEXT, INTEGER, INTERVAL);
DROP FUNCTION IF EXISTS is_verifier(TEXT);

-- Drop existing policies (in case they exist)
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Only admins can modify users" ON users;
DROP POLICY IF EXISTS "Anyone can view verified entries" ON entries;
DROP POLICY IF EXISTS "Contributors can create entries" ON entries;
DROP POLICY IF EXISTS "Users can update their own unverified entries" ON entries;
DROP POLICY IF EXISTS "Verifiers can update any entry" ON entries;
DROP POLICY IF EXISTS "Anyone can view votes" ON votes;
DROP POLICY IF EXISTS "Authenticated users can vote" ON votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON votes;
DROP POLICY IF EXISTS "Public read access" ON stats;
DROP POLICY IF EXISTS "Public read access" ON bible_verses;
DROP POLICY IF EXISTS "Public read access" ON entry_stats;
DROP POLICY IF EXISTS "Public read access" ON entry_bible_verses;
DROP POLICY IF EXISTS "Public read access" ON entry_revisions;

-- Clean up any Gateway Model policies that might exist
DROP POLICY IF EXISTS "public_read_entries" ON entries;
DROP POLICY IF EXISTS "public_read_entry_revisions" ON entry_revisions;
DROP POLICY IF EXISTS "public_read_stats" ON stats;
DROP POLICY IF EXISTS "public_read_entry_stats" ON entry_stats;
DROP POLICY IF EXISTS "public_read_bible_verses" ON bible_verses;
DROP POLICY IF EXISTS "public_read_entry_bible_verses" ON entry_bible_verses;
DROP POLICY IF EXISTS "public_read_votes" ON votes;
DROP POLICY IF EXISTS "public_read_verifier_allowlist" ON verifier_allowlist;
DROP POLICY IF EXISTS "public_read_rate_limits" ON rate_limits;

-- Drop any existing indexes
DROP INDEX IF EXISTS entries_search_idx;
DROP INDEX IF EXISTS entries_video_id_idx;
DROP INDEX IF EXISTS entries_verified_status_idx;
DROP INDEX IF EXISTS entries_submitted_by_idx;
DROP INDEX IF EXISTS rate_limits_user_idx;
DROP INDEX IF EXISTS rate_limits_ip_idx;

-- Reset any row level security
-- (This will be re-enabled in the gateway-schema.sql)

SELECT 'Database cleanup complete. Now run gateway-schema.sql' as status;