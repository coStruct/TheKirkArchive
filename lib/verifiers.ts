import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export function hashClerkId(clerkUserId: string): string {
  return crypto.createHash('sha256').update(clerkUserId).digest('hex')
}

export async function isVerifier(clerkUserId: string): Promise<boolean> {
  const hash = hashClerkId(clerkUserId)

  const { data, error } = await supabaseAdmin
    .from('verifier_allowlist')
    .select('clerk_id_hash')
    .eq('clerk_id_hash', hash)
    .single()

  return !error && !!data
}

export async function addVerifier(clerkUserId: string, addedBy: string): Promise<boolean> {
  const hash = hashClerkId(clerkUserId)

  const { error } = await supabaseAdmin
    .from('verifier_allowlist')
    .insert({
      clerk_id_hash: hash,
      added_by_clerk_id: addedBy
    })

  return !error
}

export async function removeVerifier(clerkUserId: string): Promise<boolean> {
  const hash = hashClerkId(clerkUserId)

  const { error } = await supabaseAdmin
    .from('verifier_allowlist')
    .delete()
    .eq('clerk_id_hash', hash)

  return !error
}

export async function checkRateLimit(
  clerkUserId: string,
  ipHash: string,
  actionType: string,
  userLimitCount: number = 10,
  ipLimitCount: number = 20,
  timeWindowMinutes: number = 1
): Promise<boolean> {
  const timeWindow = `${timeWindowMinutes} minutes`

  // Check user rate limit
  const { data: userCheck } = await supabaseAdmin
    .rpc('check_rate_limit_user', {
      clerk_user_id_param: clerkUserId,
      action_type_param: actionType,
      limit_count: userLimitCount,
      time_window: timeWindow
    })

  if (!userCheck) return false

  // Check IP rate limit
  const { data: ipCheck } = await supabaseAdmin
    .rpc('check_rate_limit_ip', {
      ip_hash_param: ipHash,
      action_type_param: actionType,
      limit_count: ipLimitCount,
      time_window: timeWindow
    })

  return !!ipCheck
}

export async function recordRateLimit(
  clerkUserId: string,
  ipHash: string,
  actionType: string
): Promise<void> {
  await supabaseAdmin
    .from('rate_limits')
    .insert({
      clerk_user_id: clerkUserId,
      ip_hash: ipHash,
      action_type: actionType
    })
}