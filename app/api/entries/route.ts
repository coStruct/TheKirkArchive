import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { extractYouTubeInfo } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')
  const status = searchParams.get('status') || 'verified'
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  let dbQuery = supabase
    .from('entries')
    .select(`
      *,
      stats:entry_stats(stat:stats(*)),
      bible_verses:entry_bible_verses(verse:bible_verses(*))
    `)
    .eq('verified_status', status)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (query) {
    dbQuery = dbQuery.textSearch('search_vector', query)
  }

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entriesWithVotes = await Promise.all(
    data.map(async (entry) => {
      const { data: voteData } = await supabase
        .rpc('calculate_weighted_score', { entry_id_param: entry.id })
        .single()

      return {
        ...entry,
        vote_count: voteData
      }
    })
  )

  return NextResponse.json(entriesWithVotes)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { question, answer_summary, youtube_url, stats, bible_verses } = body

  const youtubeInfo = extractYouTubeInfo(youtube_url)
  if (!youtubeInfo) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .insert({
      question,
      answer_summary,
      video_id: youtubeInfo.videoId,
      start_seconds: youtubeInfo.startSeconds,
      submitted_by: userData.id,
      verified_status: 'pending'
    })
    .select()
    .single()

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 })
  }

  if (stats && stats.length > 0) {
    for (const stat of stats) {
      const { data: statData } = await supabase
        .from('stats')
        .upsert({ description: stat.description, source_url: stat.source_url })
        .select()
        .single()

      if (statData) {
        await supabase
          .from('entry_stats')
          .insert({ entry_id: entry.id, stat_id: statData.id })
      }
    }
  }

  if (bible_verses && bible_verses.length > 0) {
    for (const verse of bible_verses) {
      const { data: verseData } = await supabase
        .from('bible_verses')
        .upsert({
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text
        })
        .select()
        .single()

      if (verseData) {
        await supabase
          .from('entry_bible_verses')
          .insert({ entry_id: entry.id, verse_id: verseData.id })
      }
    }
  }

  return NextResponse.json(entry, { status: 201 })
}