export type UserRole = 'contributor' | 'verifier' | 'admin'

export interface User {
  id: string
  clerk_user_id: string
  roles: UserRole[]
  wallet_address?: string
  created_at: Date
}

export interface Entry {
  id: string
  question: string
  answer_summary: string
  video_id: string
  start_seconds: number
  submitted_by: string
  verified_status: 'pending' | 'verified' | 'rejected'
  is_locked: boolean
  created_at: Date
  updated_at: Date
}

export interface EntryRevision {
  id: string
  entry_id: string
  revised_by: string
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
  user_id: string
  entry_id: string
  vote_type: 'upvote' | 'downvote'
  ip_hash: string
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