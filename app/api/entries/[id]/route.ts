import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await currentUser()
  const userRoles = user?.publicMetadata?.roles as string[] | undefined

  if (!userRoles?.includes('verifier') && !userRoles?.includes('admin')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const body = await req.json()
  const { verified_status, is_locked } = body

  const updateData: any = {}
  if (verified_status !== undefined) {
    updateData.verified_status = verified_status
  }
  if (is_locked !== undefined) {
    updateData.is_locked = is_locked
  }

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('entries')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await currentUser()
  const userRoles = user?.publicMetadata?.roles as string[] | undefined

  if (!userRoles?.includes('admin')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}