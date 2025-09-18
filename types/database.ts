// Gateway Model Types - No User table, direct Clerk integration

export interface Entry {
  id: string
  question: string
  answer_summary: string
  video_id: string
  start_seconds: number
  submitted_by_clerk_id: string
  verified_status: 'pending' | 'verified' | 'rejected'
  is_locked: boolean
  created_at: Date
  updated_at: Date
}

export interface EntryRevision {
  id: string
  entry_id: string
  revised_by_clerk_id: string
  changes_json: Record<string, any>
  created_at: Date
}

export interface Stat {
  id: string
  description: string
  source_url?: string
}

export interface BibleVerse {
  id: string
  book: string
  chapter: number
  verse: number
  text: string
}

export interface Vote {
  clerk_user_id: string
  entry_id: string
  vote_type: 'upvote' | 'downvote'
  ip_hash: string
  created_at: Date
}

export interface VerifierAllowlist {
  clerk_id_hash: string
  added_by_clerk_id: string
  created_at: Date
}

export interface RateLimit {
  id: string
  clerk_user_id?: string
  ip_hash?: string
  action_type: string
  created_at: Date
}

export interface EntryWithRelations extends Entry {
  stats?: Stat[]
  bible_verses?: BibleVerse[]
  vote_count?: {
    upvotes: number
    downvotes: number
    weighted_score: number
  }
}

// Helper types for API responses
export interface VoteResponse {
  vote: Vote
  vote_count: {
    upvotes: number
    downvotes: number
    weighted_score: number
  }
}

export interface EntrySubmission {
  question: string
  answer_summary: string
  youtube_url: string
  stats?: Array<{ description: string; source_url?: string }>
  bible_verses?: Array<{ book: string; chapter: number; verse: number; text: string }>
}