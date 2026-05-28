# Onboarding + Backend Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 5-step onboarding UI to InsForge (Postgres + RLS), bridge Auth0 JWTs to InsForge, and add live Gmail + X OAuth connections in step 4.

**Architecture:** Auth0 handles identity; a Post Login Action signs an InsForge-compatible JWT and embeds it as a custom claim. The Next.js app extracts this token via `beforeSessionSaved` and passes it to the InsForge SDK as `edgeFunctionToken`. RLS uses `requesting_user_id()` (derived from the JWT `sub` claim) to restrict every row to its owner.

**Tech Stack:** `@auth0/nextjs-auth0` v4, `@insforge/sdk`, Next.js 16 App Router, TypeScript, Google OAuth 2.0, Twitter OAuth 2.0 PKCE

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/auth0.ts` | Modify | Add `beforeSessionSaved` to extract InsForge token |
| `lib/insforge.ts` | Create | InsForge client factory using Auth0 session token |
| `lib/auth.tsx` | Modify | Add `returnTo=/onboarding` for signup flow |
| `migrations/TIMESTAMP_init-schema.sql` | Create | 3 tables + `requesting_user_id()` + RLS |
| `app/api/onboarding/complete/route.ts` | Create | POST — atomic save of all onboarding data |
| `app/api/integrations/gmail/route.ts` | Create | GET — initiate Gmail OAuth |
| `app/api/integrations/gmail/callback/route.ts` | Create | GET — Gmail OAuth callback, save tokens |
| `app/api/integrations/x/route.ts` | Create | GET — initiate X OAuth 2.0 PKCE |
| `app/api/integrations/x/callback/route.ts` | Create | GET — X OAuth callback, save tokens |
| `components/vibeops/onboarding.tsx` | Modify | Wire IntegrationStep to live OAuth buttons |
| `app/onboarding/page.tsx` | Modify | Call complete API on final step + check completion on load |
| `.env.local` | Modify | Add InsForge + Gmail + X OAuth env vars |

---

## Task 1: Install `@insforge/sdk` and configure env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install the SDK**

```bash
cd /Users/aleenajaison/Documents/web/vibeops && npm install @insforge/sdk@latest
```

Expected: `added X packages` with no errors.

- [ ] **Step 2: Get InsForge anon key and URL**

```bash
npx @insforge/cli secrets get JWT_SECRET
```

Save this value — you'll need it for the Auth0 Post Login Action in Task 2.

- [ ] **Step 3: Add env vars to `.env.local`**

Append these lines to `.env.local`:

```env
# InsForge
NEXT_PUBLIC_INSFORGE_URL='https://jytsi694.ap-southeast.insforge.app'
NEXT_PUBLIC_INSFORGE_ANON_KEY='ik_995a8c2f882c3799664c8e7c28576b61'

# Gmail OAuth (get from Google Cloud Console → APIs & Services → Credentials)
GMAIL_CLIENT_ID=''
GMAIL_CLIENT_SECRET=''

# X (Twitter) OAuth (get from developer.twitter.com → App → Keys and Tokens)
X_CLIENT_ID=''
X_CLIENT_SECRET=''
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @insforge/sdk"
```

---

## Task 2: Auth0 Post Login Action (manual steps)

These steps must be done in the Auth0 dashboard — they cannot be automated.

- [ ] **Step 1: Get the InsForge JWT secret**

```bash
npx @insforge/cli secrets get JWT_SECRET
```

Copy the output value.

- [ ] **Step 2: Create the Post Login Action in Auth0 Dashboard**

1. Go to Auth0 Dashboard → Actions → Library → Create Action
2. Name: `Generate InsForge Token`, Trigger: **Login / Post Login**
3. In the action editor, click **Add Dependency** → add `jsonwebtoken` (version `9`)
4. In the action editor, click **Secrets** → add secret `INSFORGE_JWT_SECRET` = (value from Step 1)
5. Replace the action code with:

```javascript
const jwt = require('jsonwebtoken');

exports.onExecutePostLogin = async (event, api) => {
  const insforgeToken = jwt.sign(
    {
      sub: event.user.user_id,
      role: 'authenticated',
      aud: 'insforge-api',
      email: event.user.email,
    },
    event.secrets.INSFORGE_JWT_SECRET,
    { expiresIn: '1h' }
  );

  api.idToken.setCustomClaim('https://insforge.dev/insforge_token', insforgeToken);
};
```

6. Click **Deploy**
7. Go to Actions → Flows → Login → drag `Generate InsForge Token` into the post-login flow → Apply

- [ ] **Step 3: Verify the action is in the flow**

In Auth0 Dashboard → Actions → Flows → Login, confirm `Generate InsForge Token` appears between **Start** and **Complete**.

---

## Task 3: Update `lib/auth0.ts` with `beforeSessionSaved`

**Files:**
- Modify: `lib/auth0.ts`

- [ ] **Step 1: Read current file**

Current contents of `lib/auth0.ts`:
```ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";
export const auth0 = new Auth0Client();
```

- [ ] **Step 2: Replace with `beforeSessionSaved` config**

Replace the entire file contents with:

```ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  beforeSessionSaved: async (session, idToken) => {
    if (idToken) {
      const parts = idToken.split(".");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString()
      );
      const insforgeToken = payload["https://insforge.dev/insforge_token"];
      if (insforgeToken) {
        (session.user ??= {})["https://insforge.dev/insforge_token"] =
          insforgeToken;
      }
    }
    return session;
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/auth0.ts
git commit -m "feat: extract InsForge token from Auth0 ID token via beforeSessionSaved"
```

---

## Task 4: Create `lib/insforge.ts` client factory

**Files:**
- Create: `lib/insforge.ts`

- [ ] **Step 1: Create the file**

```ts
import { createClient } from "@insforge/sdk";
import { auth0 } from "@/lib/auth0";

export async function createInsForgeClient() {
  const session = await auth0.getSession();
  const insforgeToken =
    session?.user?.["https://insforge.dev/insforge_token"] as
      | string
      | undefined;

  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    edgeFunctionToken: insforgeToken,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/insforge.ts
git commit -m "feat: add InsForge client factory with Auth0 JWT bridge"
```

---

## Task 5: Database schema migration

**Files:**
- Create: `migrations/TIMESTAMP_init-schema.sql` (use current timestamp)

- [ ] **Step 1: Fetch existing migration state**

```bash
npx @insforge/cli db migrations list
npx @insforge/cli db migrations fetch
```

Expected: empty list (fresh project).

- [ ] **Step 2: Create the migration file**

```bash
npx @insforge/cli db migrations new init-schema
```

This creates `migrations/YYYYMMDDHHMMSS_init-schema.sql`. Open that file and replace its contents with:

```sql
-- Helper: extract Auth0 sub from JWT
create or replace function public.requesting_user_id()
returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::text
$$;

-- User profiles
create table public.user_profiles (
  id           text primary key,
  email        text not null,
  name         text,
  picture      text,
  created_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "users can manage their own profile"
  on public.user_profiles
  for all
  using (id = requesting_user_id())
  with check (id = requesting_user_id());

-- Onboarding
create table public.onboarding (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null references public.user_profiles(id) on delete cascade,
  selected_problems  text[] not null default '{}',
  voice_transcript   text not null default '',
  practice_reply     text not null default '',
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

alter table public.onboarding enable row level security;

create policy "users can manage their own onboarding"
  on public.onboarding
  for all
  using (user_id = requesting_user_id())
  with check (user_id = requesting_user_id());

-- Channel connections (OAuth tokens for Gmail, X, etc.)
create table public.channel_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null references public.user_profiles(id) on delete cascade,
  channel          text not null,
  access_token     text not null,
  refresh_token    text,
  token_expires_at timestamptz,
  account_label    text,
  connected_at     timestamptz not null default now(),
  unique (user_id, channel)
);

alter table public.channel_connections enable row level security;

create policy "users can manage their own channel connections"
  on public.channel_connections
  for all
  using (user_id = requesting_user_id())
  with check (user_id = requesting_user_id());
```

- [ ] **Step 3: Apply the migration**

```bash
npx @insforge/cli db migrations up --all
```

Expected output: `Applied 1 migration successfully`.

- [ ] **Step 4: Verify tables exist**

```bash
npx @insforge/cli db tables
```

Expected: `user_profiles`, `onboarding`, `channel_connections` listed.

- [ ] **Step 5: Commit**

```bash
git add migrations/
git commit -m "feat: add user_profiles, onboarding, channel_connections schema with RLS"
```

---

## Task 6: Onboarding complete API route

**Files:**
- Create: `app/api/onboarding/complete/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sub, email, name, picture } = session.user as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };

  const body = await request.json() as {
    selectedProblems: string[];
    voiceTranscript: string;
    practiceReply: string;
  };

  const insforge = await createInsForgeClient();

  // Upsert user profile
  const { error: profileError } = await insforge
    .from("user_profiles")
    .upsert([{ id: sub, email, name: name ?? null, picture: picture ?? null }]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Insert onboarding row
  const { error: onboardingError } = await insforge
    .from("onboarding")
    .insert([{
      user_id: sub,
      selected_problems: body.selectedProblems,
      voice_transcript: body.voiceTranscript,
      practice_reply: body.practiceReply,
      completed_at: new Date().toISOString(),
    }]);

  if (onboardingError) {
    return NextResponse.json({ error: onboardingError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/onboarding/complete/route.ts
git commit -m "feat: add onboarding complete API route"
```

---

## Task 7: Gmail OAuth routes

**Files:**
- Create: `app/api/integrations/gmail/route.ts`
- Create: `app/api/integrations/gmail/callback/route.ts`

**Prerequisite:** You need a Google Cloud OAuth 2.0 client. Go to console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application). Set Authorized redirect URI to `http://localhost:3000/api/integrations/gmail/callback`. Copy client ID and secret into `.env.local`.

- [ ] **Step 1: Create the initiate route**

Create `app/api/integrations/gmail/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID!,
    redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/gmail/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: session.user.sub,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
```

- [ ] **Step 2: Create the callback route**

Create `app/api/integrations/gmail/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&gmail=error", request.url)
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/gmail/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&gmail=error", request.url)
    );
  }

  // Get the user's Gmail address
  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const profile = await profileRes.json() as { email?: string };

  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const insforge = await createInsForgeClient();

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error: dbError } = await insforge
    .from("channel_connections")
    .upsert([{
      user_id: session.user.sub,
      channel: "gmail",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      account_label: profile.email ?? null,
    }]);

  if (dbError) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&gmail=error", request.url)
    );
  }

  const redirectUrl = new URL("/onboarding", request.url);
  redirectUrl.searchParams.set("step", "3");
  redirectUrl.searchParams.set("gmail", "connected");
  if (profile.email) redirectUrl.searchParams.set("gmailLabel", profile.email);

  return NextResponse.redirect(redirectUrl);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/integrations/gmail/
git commit -m "feat: add Gmail OAuth connect flow"
```

---

## Task 8: X (Twitter) OAuth routes

**Files:**
- Create: `app/api/integrations/x/route.ts`
- Create: `app/api/integrations/x/callback/route.ts`

**Prerequisite:** Go to developer.twitter.com → your App → Settings → enable OAuth 2.0, set callback URL to `http://localhost:3000/api/integrations/x/callback`, set type to **Web App**. Copy Client ID and Client Secret into `.env.local`.

- [ ] **Step 1: Create the initiate route**

Create `app/api/integrations/x/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";
import crypto from "crypto";

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64URLEncode(crypto.randomBytes(16));

  const cookieStore = await cookies();
  cookieStore.set("x_oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("x_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/x/callback`,
    scope: "tweet.read tweet.write users.read dm.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(
    `https://twitter.com/i/oauth2/authorize?${params.toString()}`
  );
}
```

- [ ] **Step 2: Create the callback route**

Create `app/api/integrations/x/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedVerifier = cookieStore.get("x_oauth_verifier")?.value;
  const storedState = cookieStore.get("x_oauth_state")?.value;

  if (error || !code || state !== storedState || !storedVerifier) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&x=error", request.url)
    );
  }

  // Exchange code for tokens
  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/x/callback`,
      code_verifier: storedVerifier,
    }),
  });

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&x=error", request.url)
    );
  }

  // Get the X handle
  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = await meRes.json() as { data?: { username?: string } };

  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const insforge = await createInsForgeClient();

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error: dbError } = await insforge
    .from("channel_connections")
    .upsert([{
      user_id: session.user.sub,
      channel: "x",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      account_label: me.data?.username ? `@${me.data.username}` : null,
    }]);

  if (dbError) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&x=error", request.url)
    );
  }

  // Clean up PKCE cookies
  cookieStore.delete("x_oauth_verifier");
  cookieStore.delete("x_oauth_state");

  const redirectUrl = new URL("/onboarding", request.url);
  redirectUrl.searchParams.set("step", "3");
  redirectUrl.searchParams.set("x", "connected");
  if (me.data?.username) redirectUrl.searchParams.set("xLabel", `@${me.data.username}`);

  return NextResponse.redirect(redirectUrl);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/integrations/x/
git commit -m "feat: add X OAuth 2.0 PKCE connect flow"
```

---

## Task 9: Update IntegrationStep component

**Files:**
- Modify: `components/vibeops/onboarding.tsx`

The `IntegrationStep` needs to:
1. Read `?gmail=connected` and `?x=connected` from the URL to show connected state
2. Render real "Connect Gmail" and "Connect X" buttons that redirect to the OAuth routes
3. Show "Coming soon" badges for all other channels

- [ ] **Step 1: Update the `OnboardingProps` type and `IntegrationStep` function**

In `components/vibeops/onboarding.tsx`, replace the `IntegrationStep` function (lines ~335–367) with:

```tsx
function IntegrationStep({
  gmailConnected,
  gmailLabel,
  xConnected,
  xLabel,
}: {
  gmailConnected: boolean;
  gmailLabel?: string;
  xConnected: boolean;
  xLabel?: string;
}) {
  const channels = [
    {
      key: "gmail",
      icon: () => <img src="/gmail.svg" alt="Gmail" className="size-5" />,
      title: "Gmail",
      body: "Pull client email threads into one reviewed reply queue.",
      live: true,
      connected: gmailConnected,
      label: gmailLabel,
      href: "/api/integrations/gmail",
    },
    {
      key: "x",
      icon: () => (
        <svg className="size-4 fill-current text-zinc-800" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      title: "X (Twitter)",
      body: "Monitor and reply to DMs and mentions from clients.",
      live: true,
      connected: xConnected,
      label: xLabel,
      href: "/api/integrations/x",
    },
    {
      key: "whatsapp",
      icon: () => <img src="/whatsapp-icon.svg" alt="WhatsApp" className="size-5" />,
      title: "WhatsApp",
      body: "Manage WhatsApp client conversations with AI-drafted replies.",
      live: false,
      connected: false,
    },
    {
      key: "outlook",
      icon: () => <img src="/microsoft-outlook.svg" alt="Outlook" className="size-5" />,
      title: "Outlook",
      body: "Connect your Outlook inbox for professional email management.",
      live: false,
      connected: false,
    },
    {
      key: "notion",
      icon: () => <img src="/notion.svg" alt="Notion" className="size-5" />,
      title: "Notion",
      body: "Turn project notes into client-safe status updates.",
      live: false,
      connected: false,
    },
  ];

  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.02em]">
        Connect your client channels
      </h3>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Connect Gmail and X now. More channels are coming soon.
      </p>
      <div className="mt-7 grid gap-3">
        {channels.map((ch) => (
          <div
            key={ch.key}
            className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[2.5rem_1fr_auto] sm:items-center"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <ch.icon />
            </div>
            <div>
              <p className="font-medium">{ch.title}</p>
              <p className="text-sm text-muted-foreground">{ch.body}</p>
              {ch.connected && ch.label && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {ch.label}
                </p>
              )}
            </div>
            {ch.live ? (
              ch.connected ? (
                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-500">
                  Connected ✓
                </Badge>
              ) : (
                <a href={ch.href}>
                  <button
                    type="button"
                    className="h-9 px-4 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-sm font-semibold text-zinc-700 transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                </a>
              )
            ) : (
              <Badge variant="outline" className="text-zinc-400">
                Coming soon
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the `OnboardingFlow` to pass integration props**

In `components/vibeops/onboarding.tsx`, update the `OnboardingProps` type to add:

```ts
gmailConnected?: boolean;
gmailLabel?: string;
xConnected?: boolean;
xLabel?: string;
```

And update the `props.step === 3` line in `OnboardingFlow`:

```tsx
{props.step === 3 && (
  <IntegrationStep
    gmailConnected={props.gmailConnected ?? false}
    gmailLabel={props.gmailLabel}
    xConnected={props.xConnected ?? false}
    xLabel={props.xLabel}
  />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/vibeops/onboarding.tsx
git commit -m "feat: wire IntegrationStep with live Gmail and X OAuth connect buttons"
```

---

## Task 10: Wire onboarding page — save on complete + redirect after signup

**Files:**
- Modify: `app/onboarding/page.tsx`
- Modify: `lib/auth.tsx`

- [ ] **Step 1: Update `lib/auth.tsx` to add `returnTo` for signup**

In `lib/auth.tsx`, in the `Auth0Wrapper` `login()` function, add `returnTo` for signups. Find this block:

```ts
const login = (email?: string, isSignup?: boolean, connection?: string) => {
  const params = new URLSearchParams();
  if (isSignup) {
    params.set("screen_hint", "signup");
  }
```

And add after `params.set("screen_hint", "signup")`:

```ts
  if (isSignup) {
    params.set("returnTo", "/onboarding");
  }
```

So the full block becomes:

```ts
const login = (email?: string, isSignup?: boolean, connection?: string) => {
  const params = new URLSearchParams();
  if (isSignup) {
    params.set("screen_hint", "signup");
    params.set("returnTo", "/onboarding");
  }
  if (connection) {
    params.set("connection", connection);
  }
  if (email) {
    params.set("login_hint", email);
  }
  const queryString = params.toString();
  window.location.href = `/auth/login${queryString ? `?${queryString}` : ""}`;
};
```

- [ ] **Step 2: Replace `app/onboarding/page.tsx`**

Replace the entire file with:

```tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OnboardingFlow, onboardingSteps } from "@/components/vibeops/onboarding";
import { TopBar } from "@/components/vibeops/top-bar";
import {
  samplePracticeReply,
  sampleTranscript,
} from "@/components/vibeops/mock-data";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = Math.max(
    0,
    Math.min(
      onboardingSteps.length - 1,
      parseInt(searchParams.get("step") || "0", 10)
    )
  );

  const [selectedProblems, setSelectedProblems] = useState<string[]>([
    "Discussing price",
    "Following up without sounding desperate",
  ]);
  const [transcript, setTranscript] = useState("");
  const [practiceReply, setPracticeReply] = useState("");
  const [showAssessment, setShowAssessment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Read integration connection status from URL params
  const gmailConnected = searchParams.get("gmail") === "connected";
  const gmailLabel = searchParams.get("gmailLabel") ?? undefined;
  const xConnected = searchParams.get("x") === "connected";
  const xLabel = searchParams.get("xLabel") ?? undefined;

  function toggleProblem(problem: string) {
    setSelectedProblems((current) =>
      current.includes(problem)
        ? current.filter((item) => item !== problem)
        : [...current, problem]
    );
  }

  function handleBack() {
    if (step > 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(step - 1));
      router.push(`/onboarding?${params.toString()}`);
    }
  }

  async function handleNext() {
    if (step === onboardingSteps.length - 1) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedProblems,
            voiceTranscript: transcript,
            practiceReply,
          }),
        });
        if (!res.ok) {
          console.error("Failed to save onboarding:", await res.text());
        }
      } catch (err) {
        console.error("Onboarding save error:", err);
      } finally {
        setIsSaving(false);
      }
      router.push("/pricing");
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(step + 1));
      router.push(`/onboarding?${params.toString()}`);
    }
  }

  return (
    <OnboardingFlow
      step={step}
      progress={Math.round(((step + 1) / onboardingSteps.length) * 100)}
      selectedProblems={selectedProblems}
      transcript={transcript}
      practiceReply={practiceReply}
      showAssessment={showAssessment}
      gmailConnected={gmailConnected}
      gmailLabel={gmailLabel}
      xConnected={xConnected}
      xLabel={xLabel}
      onToggleProblem={toggleProblem}
      onTranscript={setTranscript}
      onSampleTranscript={() => setTranscript(sampleTranscript)}
      onPracticeReply={setPracticeReply}
      onSampleReply={() => {
        setPracticeReply(samplePracticeReply);
        setShowAssessment(true);
      }}
      onAssess={() => setShowAssessment(true)}
      onBack={handleBack}
      onNext={handleNext}
    />
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <TopBar onDashboard={() => router.push("/dashboard")} />
      <Suspense
        fallback={
          <div className="py-10 text-center text-muted-foreground">
            Loading onboarding...
          </div>
        }
      >
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Start dev server and manually test the flow**

```bash
npm run dev
```

1. Go to `http://localhost:3000/signup` → sign up with email → you should be redirected to `/onboarding`
2. Complete steps 1–3
3. On step 4, click "Connect Gmail" → redirects to Google OAuth
4. After Google OAuth, redirected back to `/onboarding?step=3&gmail=connected` — Gmail row shows "Connected ✓"
5. Advance to step 5 and click "Continue to plans" → redirected to `/pricing`
6. Verify data in InsForge: `npx @insforge/cli db query "SELECT * FROM onboarding LIMIT 5"`

- [ ] **Step 5: Commit**

```bash
git add app/onboarding/page.tsx lib/auth.tsx
git commit -m "feat: wire onboarding complete API call and post-signup redirect"
```
