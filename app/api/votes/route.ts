import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, recordRateLimit } from '@/lib/verifiers'
import crypto from 'crypto'

// Use service role for all database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex')
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { entry_id, vote_type } = body

  if (!entry_id || !['upvote', 'downvote'].includes(vote_type)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const ipHash = hashIP(ip)

  // Check rate limits (10 votes per user per minute, 20 per IP per minute)
  const rateLimitOk = await checkRateLimit(userId, ipHash, 'vote', 10, 20, 1)
  if (!rateLimitOk) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Record rate limit action
  await recordRateLimit(userId, ipHash, 'vote')

  // Upsert vote (update if exists, insert if not)
  const { data: vote, error: voteError } = await supabase
    .from('votes')
    .upsert({
      clerk_user_id: userId,
      entry_id,
      vote_type,
      ip_hash: ipHash
    }, {
      onConflict: 'clerk_user_id,entry_id'
    })
    .select()
    .single()

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 })
  }

  // Get updated vote count for the entry
  const { data: voteCount } = await supabase
    .rpc('calculate_weighted_score', { entry_id_param: entry_id })
    .single()

  return NextResponse.json({ vote, vote_count: voteCount })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const entry_id = searchParams.get('entry_id')

  if (!entry_id) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('votes')
    .delete()
    .eq('clerk_user_id', userId)
    .eq('entry_id', entry_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Get updated vote count for the entry
  const { data: voteCount } = await supabase
    .rpc('calculate_weighted_score', { entry_id_param: entry_id })
    .single()

  return NextResponse.json({ success: true, vote_count: voteCount })
}