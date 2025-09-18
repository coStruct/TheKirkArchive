import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isVerifier, addVerifier, removeVerifier, hashClerkId } from '@/lib/verifiers'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if the requesting user is a verifier
  const userIsVerifier = await isVerifier(userId)

  return NextResponse.json({
    is_verifier: userIsVerifier,
    clerk_id_hash: hashClerkId(userId)
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only existing verifiers can add new verifiers
  const userIsVerifier = await isVerifier(userId)
  if (!userIsVerifier) {
    return NextResponse.json({ error: 'Verifier access required' }, { status: 403 })
  }

  const body = await req.json()
  const { clerk_user_id } = body

  if (!clerk_user_id) {
    return NextResponse.json({ error: 'Clerk user ID required' }, { status: 400 })
  }

  const success = await addVerifier(clerk_user_id, userId)

  if (!success) {
    return NextResponse.json({ error: 'Failed to add verifier' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Verifier added successfully',
    clerk_id_hash: hashClerkId(clerk_user_id)
  })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only existing verifiers can remove verifiers
  const userIsVerifier = await isVerifier(userId)
  if (!userIsVerifier) {
    return NextResponse.json({ error: 'Verifier access required' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const clerk_user_id = searchParams.get('clerk_user_id')

  if (!clerk_user_id) {
    return NextResponse.json({ error: 'Clerk user ID required' }, { status: 400 })
  }

  const success = await removeVerifier(clerk_user_id)

  if (!success) {
    return NextResponse.json({ error: 'Failed to remove verifier' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Verifier removed successfully'
  })
}