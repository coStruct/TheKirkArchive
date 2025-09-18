# Migration to Gateway Model

This guide explains how to migrate from the original users table approach to the simplified Gateway Model.

## What Changed

### ❌ **Removed**
- `users` table and all user sync complexity
- Webhook infrastructure (`/api/webhooks/clerk`)
- `svix` dependency
- Complex RLS policies with infinite recursion
- `WEBHOOK_SECRET` environment variable

### ✅ **Added**
- Gateway Model: public reads, API-only writes
- Direct `clerk_user_id` storage on records
- `verifier_allowlist` table for role management
- Simplified RLS policies
- Rate limiting with dedicated table
- Service role for all database operations

## Migration Steps

### 1. Update Supabase Schema

**In your Supabase SQL Editor, run:**

```sql
-- Drop existing problematic tables if they exist
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Run the new Gateway schema
```

Then copy and paste the entire content from `supabase/gateway-schema.sql`.

### 2. Remove Clerk Webhook

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Webhooks**
3. **Delete** the webhook endpoint you created earlier
4. Remove `WEBHOOK_SECRET` from your environment variables

### 3. Add Yourself as Initial Verifier

**In Supabase SQL Editor:**

```sql
-- Replace 'your_actual_clerk_user_id' with your real Clerk user ID
INSERT INTO verifier_allowlist (clerk_id_hash, added_by_clerk_id)
VALUES (encode(sha256('your_actual_clerk_user_id'::bytea), 'hex'), 'system');
```

**To find your Clerk user ID:**
1. Sign in to your app
2. Check browser dev tools → Network tab → any API call
3. Look for the `Authorization` header or check the Clerk dashboard

### 4. Test the System

1. **Deploy to Vercel** (or test locally)
2. **Sign in** to your application
3. **Check verifier status**: Visit `/api/verifiers` to see your verifier status
4. **Submit a test entry** via the submit form
5. **Test voting** on entries
6. **Test moderation** in the dashboard (if you're a verifier)

## Environment Variables

**Updated `.env.local`** (webhook variables removed):

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## New API Endpoints

### `GET /api/verifiers`
Check if current user is a verifier:
```json
{
  "is_verifier": true,
  "clerk_id_hash": "abc123..."
}
```

### `POST /api/verifiers`
Add a new verifier (verifiers only):
```json
{
  "clerk_user_id": "user_123..."
}
```

### `DELETE /api/verifiers?clerk_user_id=user_123`
Remove a verifier (verifiers only)

## Benefits of Gateway Model

### 🚀 **Performance**
- No user lookup queries on every operation
- Direct clerk_user_id storage
- Simplified database queries

### 🔒 **Security**
- No PII stored in database
- Public read access (safe for memorial site)
- API-only writes with proper auth
- No RLS recursion issues

### 🛠 **Maintainability**
- No webhook sync to debug
- Single source of truth (Clerk)
- Cleaner, simpler codebase
- No user table to maintain

### 💾 **Data Privacy**
- Zero personal information at rest
- Only Clerk IDs stored (or hashes)
- Compliant with privacy requirements

## Troubleshooting

### "User not found" Errors
These should no longer occur since we don't look up users.

### Rate Limiting Issues
Check the `rate_limits` table for recent activity patterns.

### Verifier Access Denied
Ensure your Clerk user ID is properly added to `verifier_allowlist`.

### Vote Counting Issues
Check the `calculate_weighted_score` function is working with the new schema.

## Adding More Verifiers

**Via SQL:**
```sql
INSERT INTO verifier_allowlist (clerk_id_hash, added_by_clerk_id)
VALUES (encode(sha256('new_user_clerk_id'::bytea), 'hex'), 'your_clerk_id');
```

**Via API (when logged in as verifier):**
```bash
curl -X POST /api/verifiers \
  -H "Content-Type: application/json" \
  -d '{"clerk_user_id": "user_new_verifier_id"}'
```

The Gateway Model is now ready and should resolve all the webhook and RLS issues!