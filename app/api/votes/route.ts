import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

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

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: rateLimitUser } = await supabase
    .rpc('check_rate_limit_user', {
      user_id_param: userData.id,
      action_type: 'vote',
      limit_count: 10,
      time_window: '1 minute'
    })

  if (!rateLimitUser) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { data: rateLimitIP } = await supabase
    .rpc('check_rate_limit_ip', {
      ip_hash_param: ipHash,
      limit_count: 20,
      time_window: '1 minute'
    })

  if (!rateLimitIP) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { data: vote, error: voteError } = await supabase
    .from('votes')
    .upsert({
      user_id: userData.id,
      entry_id,
      vote_type,
      ip_hash: ipHash
    }, {
      onConflict: 'user_id,entry_id'
    })
    .select()
    .single()

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 })
  }

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

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('votes')
    .delete()
    .eq('user_id', userData.id)
    .eq('entry_id', entry_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}