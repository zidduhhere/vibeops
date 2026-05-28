# Onboarding + Backend Wiring Design

**Date:** 2026-05-28  
**Scope:** Wire the existing 5-step onboarding UI to InsForge backend, Auth0 JWT bridge, and live Gmail + X integrations.

---

## Data Flow

```
Auth0 signup → /auth/callback → check onboarding row → redirect /onboarding
→ user completes 5 steps (including Gmail/X OAuth in step 4)
→ single POST saves all onboarding data to InsForge
→ redirect /pricing
```

Auth0 handles identity. InsForge stores all application data. Auth0's `sub` (e.g. `auth0|abc123`) is the canonical user ID across the system.

---

## Auth0 → InsForge JWT Bridge

InsForge is configured to trust Auth0 as an external JWT provider via Auth0's JWKS endpoint. This means Auth0 access tokens are passed directly as the `Authorization: Bearer <token>` header on InsForge API calls — no separate InsForge session, no token duplication.

**Config required on InsForge:**
- JWKS URI: `https://dev-f7mdgd21t5rfk1b2.us.auth0.com/.well-known/jwks.json`
- JWT audience: Auth0 client ID
- `auth.uid()` in RLS policies maps to the Auth0 `sub` claim

---

## Database Schema

### `user_profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Auth0 `sub` |
| `email` | text | |
| `name` | text | |
| `picture` | text | avatar URL |
| `created_at` | timestamptz | default now() |

RLS: user can only read/write their own row (`id = auth.uid()`).

### `onboarding`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default gen_random_uuid() |
| `user_id` | text FK → user_profiles.id | |
| `selected_problems` | text[] | step 1 |
| `voice_transcript` | text | step 2 |
| `practice_reply` | text | step 3 |
| `completed_at` | timestamptz | null until final step submitted |
| `created_at` | timestamptz | default now() |

RLS: user can only read/write their own row (`user_id = auth.uid()`).

### `channel_connections`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default gen_random_uuid() |
| `user_id` | text FK → user_profiles.id | |
| `channel` | text | `gmail` or `x` |
| `access_token` | text | encrypted at rest |
| `refresh_token` | text | nullable |
| `token_expires_at` | timestamptz | nullable |
| `account_label` | text | e.g. email address or @handle |
| `connected_at` | timestamptz | default now() |

RLS: user can only read/write their own rows (`user_id = auth.uid()`).

---

## Onboarding Steps

### Step 1 — Problem Discovery
Select pain points from a list. State held in React, no API call yet.

### Step 2 — Voice Setup
Paste or type a communication style transcript. State held in React.

### Step 3 — Practice
Type a practice reply. State held in React.

### Step 4 — Integrations (Live)
Two live connectable integrations; rest shown as "Coming soon."

**Gmail:**
- Button: "Connect Gmail"
- Triggers Google OAuth flow requesting scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`
- On success: OAuth callback stores tokens in `channel_connections` row for this user
- Button state changes to "Connected ✓" with the user's Gmail address shown

**X (Twitter):**
- Button: "Connect X"
- Triggers Twitter OAuth 2.0 PKCE flow requesting scopes: `tweet.read`, `tweet.write`, `users.read`, `dm.read`
- On success: stores tokens in `channel_connections`
- Button state changes to "Connected ✓" with @handle shown

**Coming soon (greyed out):** WhatsApp, Telegram, Outlook, Notion

### Step 5 — First Value
Summary screen. No new data collected.

---

## Save Strategy

All onboarding data is saved in a **single atomic write** when the user clicks "Continue to plans" on step 5:

1. Upsert `user_profiles` row (email, name, picture from Auth0 session)
2. Insert `onboarding` row (problems, transcript, practice reply, `completed_at = now()`)
3. Redirect to `/pricing`

Channel connections (Gmail/X) are saved **immediately** when the OAuth callback returns in step 4 — they are independent of the final submit.

---

## Post-Signup Redirect Logic

In `proxy.ts` (Auth0 v4 middleware), after the callback:
- Check if an `onboarding` row with `completed_at IS NOT NULL` exists for the user
- If no completed onboarding → redirect `/onboarding`
- If onboarding complete → redirect `/dashboard`

This is done server-side in a Next.js API route that runs after the Auth0 callback.

---

## OAuth Callback Routes

Two new Next.js API routes:

- `GET /api/integrations/gmail/callback` — exchanges code for tokens, saves to `channel_connections`, redirects back to `/onboarding?step=3`
- `GET /api/integrations/x/callback` — same pattern for Twitter OAuth 2.0

OAuth client credentials (Gmail client ID/secret, X client ID/secret) stored as InsForge secrets and read server-side only.

---

## InsForge SDK Usage

```ts
// Server-side only — uses Auth0 JWT as bearer token
import { createClient } from "@insforge/sdk"

const insforge = createClient(process.env.NEXT_PUBLIC_INSFORGE_URL, process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY, {
  auth: { token: auth0AccessToken }
})
```

All DB writes go through RLS-protected tables. The anon key is safe for client-side use because RLS restricts every row to its owner.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `migrations/TIMESTAMP_init-schema.sql` | Create 3 tables + RLS policies |
| `lib/insforge.ts` | InsForge client factory (accepts Auth0 token) |
| `app/api/onboarding/complete/route.ts` | POST — saves onboarding data |
| `app/api/integrations/gmail/route.ts` | GET — initiates Gmail OAuth |
| `app/api/integrations/gmail/callback/route.ts` | GET — Gmail OAuth callback |
| `app/api/integrations/x/route.ts` | GET — initiates X OAuth |
| `app/api/integrations/x/callback/route.ts` | GET — X OAuth callback |
| `components/vibeops/onboarding.tsx` | Wire IntegrationStep to live OAuth buttons |
| `app/onboarding/page.tsx` | Call complete API on final step |
| `proxy.ts` | Add post-callback redirect logic |
