import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { isVerifier } from '@/lib/verifiers'

// Use service role for all database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a verifier
  const userIsVerifier = await isVerifier(userId)
  if (!userIsVerifier) {
    return NextResponse.json({ error: 'Verifier access required' }, { status: 403 })
  }

  const resolvedParams = await params
  const body = await req.json()
  const { verified_status, is_locked } = body

  const updateData: Record<string, unknown> = {}
  if (verified_status !== undefined) {
    updateData.verified_status = verified_status
  }
  if (is_locked !== undefined) {
    updateData.is_locked = is_locked
  }

  updateData.updated_at = new Date().toISOString()

  // Create revision record for audit trail
  const { data: currentEntry } = await supabase
    .from('entries')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (currentEntry && (verified_status !== undefined || is_locked !== undefined)) {
    await supabase
      .from('entry_revisions')
      .insert({
        entry_id: resolvedParams.id,
        revised_by_clerk_id: userId,
        changes_json: {
          old_status: currentEntry.verified_status,
          new_status: verified_status || currentEntry.verified_status,
          old_locked: currentEntry.is_locked,
          new_locked: is_locked !== undefined ? is_locked : currentEntry.is_locked,
          timestamp: new Date().toISOString()
        }
      })
  }

  const { data, error } = await supabase
    .from('entries')
    .update(updateData)
    .eq('id', resolvedParams.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a verifier (for now, only verifiers can delete)
  const userIsVerifier = await isVerifier(userId)
  if (!userIsVerifier) {
    return NextResponse.json({ error: 'Verifier access required' }, { status: 403 })
  }

  const resolvedParams = await params

  // Create deletion audit record
  const { data: entryToDelete } = await supabase
    .from('entries')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (entryToDelete) {
    await supabase
      .from('entry_revisions')
      .insert({
        entry_id: resolvedParams.id,
        revised_by_clerk_id: userId,
        changes_json: {
          action: 'deleted',
          deleted_entry: entryToDelete,
          timestamp: new Date().toISOString()
        }
      })
  }

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', resolvedParams.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}