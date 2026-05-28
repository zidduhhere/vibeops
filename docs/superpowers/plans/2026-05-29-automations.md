# Automations Execution Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real execution engine for automations — Gmail Pub/Sub webhooks trigger AI-powered email actions (agentic send or supervised hold), with a full config slide-over panel per automation.

**Architecture:** Gmail push notifications hit `/api/webhooks/gmail`, which matches the email to enabled automations and invokes an InsForge serverless function `run-automation` for each match. The function calls OpenRouter for AI output, then either sends via Gmail API (agentic) or saves for review (supervised). Users configure each automation via a right-side slide-over panel.

**Tech Stack:** Next.js 14 App Router, InsForge SDK (`@insforge/sdk`), Gmail REST API, OpenRouter API, Auth0, Tailwind CSS, shadcn/ui

---

## File Map

**Create:**
- `migrations/20260529000001_automation-configs.sql` — automation_configs + automation_runs tables
- `lib/gmail-api.ts` — Gmail token refresh, send email, watch registration helpers
- `lib/automation-matcher.ts` — checks which automations match an incoming email
- `functions/run-automation/index.ts` — InsForge serverless function: AI call + Gmail send
- `app/api/webhooks/gmail/route.ts` — Gmail Pub/Sub push endpoint
- `app/api/automations/config/route.ts` — GET/POST automation_configs
- `app/api/automations/runs/route.ts` — GET automation_runs per key
- `app/api/automations/send/route.ts` — POST send a held_for_review run
- `app/api/automations/run-now/route.ts` — POST manually trigger automation

**Modify:**
- `lib/insforge.ts` — add AutomationConfig + AutomationRun types
- `components/vibeops/dashboard/automations.tsx` — add config slide-over panel, mode badges, live run counts
- `app/api/integrations/gmail/callback/route.ts` — register Gmail watch after connect
- `app/api/integrations/gmail/disconnect/route.ts` — stop Gmail watch on disconnect

---

## Task 1: DB Migration — automation_configs + automation_runs

**Files:**
- Create: `migrations/20260529000001_automation-configs.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- automation_configs: per-user config for each automation
CREATE TABLE IF NOT EXISTS public.automation_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  mode text NOT NULL DEFAULT 'supervised' CHECK (mode IN ('agentic', 'supervised')),
  trigger_params jsonb DEFAULT '{}',
  ai_prompt text DEFAULT '',
  tone text NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly')),
  gmail_filter text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, automation_key)
);

ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own automation configs"
  ON public.automation_configs FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- automation_runs: execution log
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'held_for_review', 'failed')),
  trigger_email_id text,
  trigger_email_subject text,
  trigger_email_from text,
  ai_output text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own automation runs"
  ON public.automation_runs FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- gmail_watches: track active Gmail push subscriptions per user
CREATE TABLE IF NOT EXISTS public.gmail_watches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  history_id text,
  expiration timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.gmail_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own gmail watches"
  ON public.gmail_watches FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
```

- [ ] **Step 2: Run the migration via InsForge CLI**

```bash
insforge db migrate --file migrations/20260529000001_automation-configs.sql
```

Expected: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add migrations/20260529000001_automation-configs.sql
git commit -m "feat: add automation_configs, automation_runs, gmail_watches tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `lib/insforge.ts`

- [ ] **Step 1: Add types to lib/insforge.ts**

Append after the existing type exports:

```typescript
export type AutomationMode = "agentic" | "supervised";
export type AutomationTone = "professional" | "casual" | "friendly";
export type AutomationRunStatus = "pending" | "sent" | "held_for_review" | "failed";

export interface AutomationConfig {
  id: string;
  user_id: string;
  automation_key: string;
  mode: AutomationMode;
  trigger_params: Record<string, unknown>;
  ai_prompt: string;
  tone: AutomationTone;
  gmail_filter: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  user_id: string;
  automation_key: string;
  status: AutomationRunStatus;
  trigger_email_id: string | null;
  trigger_email_subject: string | null;
  trigger_email_from: string | null;
  ai_output: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface GmailWatch {
  id: string;
  user_id: string;
  history_id: string | null;
  expiration: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/insforge.ts
git commit -m "feat: add AutomationConfig, AutomationRun, GmailWatch types"
```

---

## Task 3: Gmail API Helper Library

**Files:**
- Create: `lib/gmail-api.ts`

- [ ] **Step 1: Create lib/gmail-api.ts**

```typescript
// Gmail REST API helpers — token refresh, send, watch registration

interface GmailTokens {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
}

export async function refreshGmailToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

export async function getValidAccessToken(tokens: GmailTokens): Promise<string> {
  const expiresAt = tokens.token_expires_at ? new Date(tokens.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60_000;
  if (!isExpired) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error("No refresh token available");
  return refreshGmailToken(tokens.refresh_token);
}

export async function fetchGmailMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const msg = await res.json() as {
    id: string;
    threadId: string;
    snippet: string;
    payload?: {
      headers?: { name: string; value: string }[];
      parts?: { mimeType: string; body?: { data?: string } }[];
      body?: { data?: string };
    };
  };

  const headers = msg.payload?.headers ?? [];
  const subject = headers.find(h => h.name === "Subject")?.value ?? "(no subject)";
  const from = headers.find(h => h.name === "From")?.value ?? "";

  // Extract plain text body
  let body = "";
  const parts = msg.payload?.parts ?? [];
  const textPart = parts.find(p => p.mimeType === "text/plain");
  const rawData = textPart?.body?.data ?? msg.payload?.body?.data ?? "";
  if (rawData) {
    body = Buffer.from(rawData, "base64url").toString("utf-8");
  }

  return { id: msg.id, threadId: msg.threadId, subject, from, body, snippet: msg.snippet };
}

export async function fetchGmailHistory(
  accessToken: string,
  startHistoryId: string
): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json() as {
    history?: { messagesAdded?: { message: { id: string } }[] }[];
    historyId?: string;
  };

  const messageIds: string[] = [];
  for (const entry of data.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      messageIds.push(added.message.id);
    }
  }
  return messageIds;
}

export async function sendGmailReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<void> {
  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
  const rawMessage = [
    `To: ${to}`,
    `Subject: ${replySubject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage).toString("base64url");

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded, threadId }),
  });
}

export async function registerGmailWatch(
  accessToken: string,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
      }),
    }
  );
  const data = await res.json() as { historyId?: string; expiration?: string; error?: unknown };
  if (!data.historyId) throw new Error(`Watch registration failed: ${JSON.stringify(data.error)}`);
  return {
    historyId: data.historyId,
    expiration: new Date(Number(data.expiration)).toISOString(),
  };
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/gmail-api.ts
git commit -m "feat: add Gmail API helper library"
```

---

## Task 4: Automation Matcher

**Files:**
- Create: `lib/automation-matcher.ts`

- [ ] **Step 1: Create lib/automation-matcher.ts**

```typescript
// Determines which enabled automations match an incoming email

export interface IncomingEmail {
  id: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
}

export interface EnabledAutomation {
  automation_key: string;
  gmail_filter: string;
  trigger_params: Record<string, unknown>;
}

const PRICING_KEYWORDS = ["pricing", "price", "cost", "budget", "quote", "how much", "rates"];
const SCOPE_KEYWORDS = ["also", "additionally", "while you're at it", "can you also", "one more thing", "add", "extra"];

function emailMatchesFilter(email: IncomingEmail, gmailFilter: string): boolean {
  if (!gmailFilter) return true;
  const text = `${email.subject} ${email.from} ${email.body}`.toLowerCase();
  // Support simple from: filter
  if (gmailFilter.startsWith("from:")) {
    const domain = gmailFilter.replace("from:", "").trim();
    return email.from.includes(domain);
  }
  // Support label: filter — can't check labels here without extra API call, skip match
  if (gmailFilter.startsWith("label:")) return true;
  // Plain keyword
  return text.includes(gmailFilter.toLowerCase());
}

function emailText(email: IncomingEmail): string {
  return `${email.subject} ${email.body}`.toLowerCase();
}

export function matchAutomations(
  email: IncomingEmail,
  automations: EnabledAutomation[]
): EnabledAutomation[] {
  return automations.filter(a => {
    if (!emailMatchesFilter(email, a.gmail_filter)) return false;

    switch (a.automation_key) {
      case "auto_draft_pricing": {
        const keywords = (a.trigger_params.keywords as string[] | undefined) ?? PRICING_KEYWORDS;
        return keywords.some(k => emailText(email).includes(k.toLowerCase()));
      }
      case "scope_creep_detector": {
        return SCOPE_KEYWORDS.some(k => emailText(email).includes(k.toLowerCase()));
      }
      case "lead_qualification": {
        // Fires on any new email from an unknown sender (no filtering here — API route handles new-contact check)
        return true;
      }
      case "proposal_followup":
      case "weekly_status":
      case "invoice_reminder":
        // Time-based automations — not triggered by incoming email, skip
        return false;
      default:
        return false;
    }
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/automation-matcher.ts
git commit -m "feat: add automation email matcher"
```

---

## Task 5: Automation Config API Route

**Files:**
- Create: `app/api/automations/config/route.ts`

- [ ] **Step 1: Create app/api/automations/config/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import type { AutomationConfig } from "@/lib/insforge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = db.database.from("automation_configs").select("*").eq("user_id", user.id);
    if (key) query = query.eq("automation_key", key);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ configs: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as Partial<AutomationConfig>;
    const { automation_key, mode, trigger_params, ai_prompt, tone, gmail_filter } = body;

    if (!automation_key) return NextResponse.json({ error: "automation_key required" }, { status: 400 });

    const { error } = await db.database
      .from("automation_configs")
      .upsert([{
        user_id: user.id,
        automation_key,
        mode: mode ?? "supervised",
        trigger_params: trigger_params ?? {},
        ai_prompt: ai_prompt ?? "",
        tone: tone ?? "professional",
        gmail_filter: gmail_filter ?? "",
        updated_at: new Date().toISOString(),
      }], { onConflict: "user_id, automation_key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/automations/config/route.ts
git commit -m "feat: add automation config GET/POST API route"
```

---

## Task 6: Automation Runs API Routes

**Files:**
- Create: `app/api/automations/runs/route.ts`
- Create: `app/api/automations/send/route.ts`
- Create: `app/api/automations/run-now/route.ts`

- [ ] **Step 1: Create app/api/automations/runs/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = db.database
      .from("automation_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (key) query = query.eq("automation_key", key);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ runs: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create app/api/automations/send/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { getValidAccessToken, sendGmailReply } from "@/lib/gmail-api";

export async function POST(req: Request) {
  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { run_id } = await req.json() as { run_id: string };
    if (!run_id) return NextResponse.json({ error: "run_id required" }, { status: 400 });

    // Fetch the run
    const { data: run, error: runErr } = await db.database
      .from("automation_runs")
      .select("*")
      .eq("id", run_id)
      .eq("user_id", user.id)
      .single();

    if (runErr || !run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    if (run.status !== "held_for_review") return NextResponse.json({ error: "Run is not held for review" }, { status: 400 });
    if (!run.ai_output) return NextResponse.json({ error: "No AI output to send" }, { status: 400 });

    // Fetch Gmail tokens
    const { data: conn } = await db.database
      .from("channel_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("channel", "gmail")
      .single();

    if (!conn) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

    const accessToken = await getValidAccessToken({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      token_expires_at: conn.token_expires_at,
    });

    await sendGmailReply(
      accessToken,
      run.trigger_email_from ?? "",
      run.trigger_email_subject ?? "",
      run.ai_output
    );

    const { error: updateErr } = await db.database
      .from("automation_runs")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", run_id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create app/api/automations/run-now/route.ts**

```typescript
import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { getValidAccessToken, fetchGmailHistory, fetchGmailMessage } from "@/lib/gmail-api";
import { matchAutomations } from "@/lib/automation-matcher";

export async function POST(req: Request) {
  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { automation_key } = await req.json() as { automation_key: string };
    if (!automation_key) return NextResponse.json({ error: "automation_key required" }, { status: 400 });

    // Fetch config
    const { data: config } = await db.database
      .from("automation_configs")
      .select("*")
      .eq("user_id", user.id)
      .eq("automation_key", automation_key)
      .single();

    // Fetch Gmail tokens
    const { data: conn } = await db.database
      .from("channel_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("channel", "gmail")
      .single();

    if (!conn) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

    const accessToken = await getValidAccessToken({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      token_expires_at: conn.token_expires_at,
    });

    // Fetch latest message from inbox
    const recentRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&labelIds=INBOX",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const recentData = await recentRes.json() as { messages?: { id: string }[] };
    const messageIds = (recentData.messages ?? []).map(m => m.id);

    if (messageIds.length === 0) {
      return NextResponse.json({ error: "No recent emails found" }, { status: 400 });
    }

    // Find first email that matches this automation
    for (const msgId of messageIds) {
      const email = await fetchGmailMessage(accessToken, msgId);
      const matches = matchAutomations(email, [{
        automation_key,
        gmail_filter: config?.gmail_filter ?? "",
        trigger_params: config?.trigger_params ?? {},
      }]);

      if (matches.length > 0) {
        // Invoke the run-automation function
        await db.functions.invoke("run-automation", {
          body: {
            user_id: user.id,
            automation_key,
            email_data: {
              id: email.id,
              subject: email.subject,
              from: email.from,
              body: email.body,
            },
          },
        });
        return NextResponse.json({ success: true, triggered_for: email.subject });
      }
    }

    return NextResponse.json({ success: false, message: "No matching email found in last 5 inbox messages" });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/automations/runs/route.ts app/api/automations/send/route.ts app/api/automations/run-now/route.ts
git commit -m "feat: add automation runs, send, and run-now API routes"
```

---

## Task 7: Gmail Pub/Sub Webhook Route

**Files:**
- Create: `app/api/webhooks/gmail/route.ts`

- [ ] **Step 1: Create app/api/webhooks/gmail/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { getValidAccessToken, fetchGmailHistory, fetchGmailMessage } from "@/lib/gmail-api";
import { matchAutomations } from "@/lib/automation-matcher";

// Gmail Pub/Sub push messages are base64-encoded JSON: { emailAddress, historyId }
interface PubSubMessage {
  message: {
    data: string; // base64 encoded
    messageId: string;
  };
  subscription: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as PubSubMessage;
    const decoded = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf-8")) as {
      emailAddress: string;
      historyId: string;
    };

    const { emailAddress, historyId } = decoded;
    if (!emailAddress || !historyId) return NextResponse.json({ ok: true }); // ack invalid

    // Use service-level InsForge client — no Auth0 session in webhook context
    // We look up the user by their Gmail address stored in channel_connections
    const { createClient } = await import("@insforge/sdk");
    const serviceDb = createClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.INSFORGE_SERVICE_KEY!, // service role key bypasses RLS
    });

    // Find user by gmail account_label
    const { data: conn } = await serviceDb.database
      .from("channel_connections")
      .select("user_id, access_token, refresh_token, token_expires_at")
      .eq("channel", "gmail")
      .eq("account_label", emailAddress)
      .single();

    if (!conn) return NextResponse.json({ ok: true }); // unknown user, ack

    // Fetch stored historyId for this user
    const { data: watch } = await serviceDb.database
      .from("gmail_watches")
      .select("history_id")
      .eq("user_id", conn.user_id)
      .single();

    const startHistoryId = watch?.history_id ?? historyId;

    const accessToken = await getValidAccessToken({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      token_expires_at: conn.token_expires_at,
    });

    const newMessageIds = await fetchGmailHistory(accessToken, startHistoryId);

    // Update stored historyId
    await serviceDb.database
      .from("gmail_watches")
      .upsert([{ user_id: conn.user_id, history_id: historyId, updated_at: new Date().toISOString() }],
        { onConflict: "user_id" });

    if (newMessageIds.length === 0) return NextResponse.json({ ok: true });

    // Fetch enabled automations for this user
    const { data: userAutomations } = await serviceDb.database
      .from("user_automations")
      .select("automation_key")
      .eq("user_id", conn.user_id)
      .eq("enabled", true);

    if (!userAutomations?.length) return NextResponse.json({ ok: true });

    const { data: configs } = await serviceDb.database
      .from("automation_configs")
      .select("automation_key, gmail_filter, trigger_params")
      .eq("user_id", conn.user_id)
      .in("automation_key", userAutomations.map(a => a.automation_key));

    // Process each new message
    for (const msgId of newMessageIds) {
      const email = await fetchGmailMessage(accessToken, msgId);

      const enabledWithConfigs = userAutomations.map(a => ({
        automation_key: a.automation_key,
        gmail_filter: configs?.find(c => c.automation_key === a.automation_key)?.gmail_filter ?? "",
        trigger_params: configs?.find(c => c.automation_key === a.automation_key)?.trigger_params ?? {},
      }));

      const matched = matchAutomations(email, enabledWithConfigs);

      for (const automation of matched) {
        // Fire and forget — invoke async InsForge function
        serviceDb.functions.invoke("run-automation", {
          body: {
            user_id: conn.user_id,
            automation_key: automation.automation_key,
            email_data: {
              id: email.id,
              subject: email.subject,
              from: email.from,
              body: email.body,
            },
          },
        }).catch(console.error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gmail webhook error:", err);
    return NextResponse.json({ ok: true }); // always ack to avoid Pub/Sub retry loop
  }
}
```

- [ ] **Step 2: Add INSFORGE_SERVICE_KEY to .env.local**

Add this line to `.env.local` (get the service key from InsForge dashboard → Settings → API Keys):

```
INSFORGE_SERVICE_KEY=your_service_role_key_here
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/gmail/route.ts
git commit -m "feat: add Gmail Pub/Sub webhook route"
```

---

## Task 8: InsForge Serverless Function — run-automation

**Files:**
- Create: `functions/run-automation/index.ts`

- [ ] **Step 1: Create functions/run-automation/index.ts**

```typescript
// InsForge serverless function: run-automation
// Invoked by webhook or run-now with { user_id, automation_key, email_data }
// Calls OpenRouter AI, then sends (agentic) or holds (supervised)

import { createClient } from "@insforge/sdk";
import { getValidAccessToken, sendGmailReply } from "../../lib/gmail-api";

interface EmailData {
  id: string;
  subject: string;
  from: string;
  body: string;
}

interface RunAutomationPayload {
  user_id: string;
  automation_key: string;
  email_data: EmailData;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Write in a professional, formal tone.",
  casual: "Write in a casual, friendly tone.",
  friendly: "Write in a warm, personable tone.",
};

const AUTOMATION_PROMPTS: Record<string, string> = {
  auto_draft_pricing:
    "The following email asks about pricing or budget. Write a reply that starts with a discovery question to understand the prospect's needs before mentioning any numbers. Do not quote prices.",
  scope_creep_detector:
    "The following client email requests additional work beyond the original scope. Write a professional reply that acknowledges the request, notes it falls outside the current project scope, and offers to discuss it as a separate engagement.",
  lead_qualification:
    "Analyse the following email from a new contact. Write a brief, friendly reply that asks 2 clarifying questions to understand their project needs, timeline, and budget range.",
};

export default async function handler(req: Request): Promise<Response> {
  const payload = await req.json() as RunAutomationPayload;
  const { user_id, automation_key, email_data } = payload;

  const db = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.INSFORGE_SERVICE_KEY!,
  });

  // Create a pending run record
  const { data: run, error: insertErr } = await db.database
    .from("automation_runs")
    .insert([{
      user_id,
      automation_key,
      status: "pending",
      trigger_email_id: email_data.id,
      trigger_email_subject: email_data.subject,
      trigger_email_from: email_data.from,
    }])
    .select()
    .single();

  if (insertErr || !run) {
    return Response.json({ error: "Failed to create run record" }, { status: 500 });
  }

  try {
    // Fetch config
    const { data: config } = await db.database
      .from("automation_configs")
      .select("*")
      .eq("user_id", user_id)
      .eq("automation_key", automation_key)
      .single();

    const mode = config?.mode ?? "supervised";
    const tone = config?.tone ?? "professional";
    const customPrompt = config?.ai_prompt ?? "";

    const basePrompt = AUTOMATION_PROMPTS[automation_key] ?? "Reply to the following email helpfully.";
    const toneInstruction = TONE_INSTRUCTIONS[tone] ?? "";
    const fullPrompt = [
      basePrompt,
      toneInstruction,
      customPrompt ? `Additional instructions: ${customPrompt}` : "",
      "",
      `--- EMAIL ---`,
      `From: ${email_data.from}`,
      `Subject: ${email_data.subject}`,
      "",
      email_data.body.substring(0, 2000), // cap at 2k chars
    ].filter(Boolean).join("\n");

    // Call OpenRouter
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_BASE_URL ?? "",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [{ role: "user", content: fullPrompt }],
        max_tokens: 500,
      }),
    });

    const aiData = await aiRes.json() as {
      choices?: { message: { content: string } }[];
      error?: { message: string };
    };

    if (aiData.error || !aiData.choices?.[0]) {
      throw new Error(aiData.error?.message ?? "OpenRouter returned no result");
    }

    const aiOutput = aiData.choices[0].message.content.trim();

    if (mode === "agentic") {
      // Fetch Gmail tokens and send
      const { data: conn } = await db.database
        .from("channel_connections")
        .select("access_token, refresh_token, token_expires_at")
        .eq("user_id", user_id)
        .eq("channel", "gmail")
        .single();

      if (!conn) throw new Error("Gmail not connected");

      const accessToken = await getValidAccessToken({
        access_token: conn.access_token,
        refresh_token: conn.refresh_token,
        token_expires_at: conn.token_expires_at,
      });

      await sendGmailReply(accessToken, email_data.from, email_data.subject, aiOutput);

      await db.database
        .from("automation_runs")
        .update({ status: "sent", ai_output: aiOutput, sent_at: new Date().toISOString() })
        .eq("id", run.id);
    } else {
      // Supervised — hold for review
      await db.database
        .from("automation_runs")
        .update({ status: "held_for_review", ai_output: aiOutput })
        .eq("id", run.id);
    }

    return Response.json({ success: true, run_id: run.id, mode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await db.database
      .from("automation_runs")
      .update({ status: "failed", error_message: message })
      .eq("id", run.id);

    return Response.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Deploy the function via InsForge CLI**

```bash
insforge functions deploy run-automation --file functions/run-automation/index.ts
```

Expected: Function deployed successfully at `run-automation`.

- [ ] **Step 3: Set OPENROUTER_API_KEY secret on the function**

```bash
insforge secrets set OPENROUTER_API_KEY=your_openrouter_key
insforge secrets set INSFORGE_SERVICE_KEY=your_service_key
insforge secrets set APP_BASE_URL=https://your-app.com
insforge secrets set NEXT_PUBLIC_INSFORGE_URL=https://your-app.region.insforge.app
```

- [ ] **Step 4: Commit**

```bash
git add functions/run-automation/index.ts
git commit -m "feat: add run-automation InsForge serverless function"
```

---

## Task 9: Register Gmail Watch After Connect

**Files:**
- Modify: `app/api/integrations/gmail/callback/route.ts`

- [ ] **Step 1: Add watch registration after successful Gmail connect**

In `app/api/integrations/gmail/callback/route.ts`, after the successful upsert of `channel_connections` (after line 84), add:

```typescript
  // Register Gmail Push Notification watch
  try {
    const { registerGmailWatch } = await import("@/lib/gmail-api");
    const watch = await registerGmailWatch(
      tokens.access_token,
      process.env.GMAIL_PUBSUB_TOPIC!
    );

    await insforge.database
      .from("gmail_watches")
      .upsert([{
        user_id: session.user.sub,
        history_id: watch.historyId,
        expiration: watch.expiration,
        updated_at: new Date().toISOString(),
      }], { onConflict: "user_id" });
  } catch (watchErr) {
    console.error("Failed to register Gmail watch:", watchErr);
    // Non-fatal — app still works, automations just won't fire in real-time
  }
```

- [ ] **Step 2: Add GMAIL_PUBSUB_TOPIC to .env.local**

```
GMAIL_PUBSUB_TOPIC=projects/YOUR_GCP_PROJECT/topics/YOUR_TOPIC_NAME
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/integrations/gmail/callback/route.ts
git commit -m "feat: register Gmail watch on OAuth connect"
```

---

## Task 10: UI — Enhanced Automation Cards + Config Slide-Over Panel

**Files:**
- Modify: `components/vibeops/dashboard/automations.tsx`

- [ ] **Step 1: Replace automations.tsx with full implementation**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Settings, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutomationConfig, AutomationRun } from "@/lib/insforge";

const AUTOMATIONS = [
  { id: "1", key: "auto_draft_pricing", name: "Auto-draft pricing replies", description: "When a Gmail thread contains pricing keywords, AI drafts a discovery-first reply for your review.", category: "Leads", triggerType: "email" },
  { id: "2", key: "scope_creep_detector", name: "Scope creep detector", description: "Flags any client message requesting work outside the original proposal scope before replying.", category: "Clients", triggerType: "email" },
  { id: "3", key: "proposal_followup", name: "Proposal follow-up reminder", description: "If a proposal hasn't received a reply in 3 days, remind you and offer a draft nudge.", category: "Leads", triggerType: "time" },
  { id: "4", key: "weekly_status", name: "Weekly project status", description: "Every Friday, draft a status update for each active client based on Notion task notes.", category: "Clients", triggerType: "time" },
  { id: "5", key: "invoice_reminder", name: "Invoice reminder", description: "7 days after an invoice is sent with no payment, draft a polite reminder email.", category: "Finance", triggerType: "time" },
  { id: "6", key: "lead_qualification", name: "New lead qualification", description: "Analyse first messages from new contacts and score them on intent, budget signals, and scope clarity.", category: "Leads", triggerType: "email" },
];

const CATEGORIES = ["All", "Leads", "Clients", "Finance"];
const TONES = ["professional", "casual", "friendly"] as const;

const TRIGGER_PARAM_FIELDS: Record<string, { label: string; field: string; type: "tags" | "number" | "day" }[]> = {
  auto_draft_pricing: [{ label: "Trigger keywords", field: "keywords", type: "tags" }],
  proposal_followup: [{ label: "Days without reply", field: "delay_days", type: "number" }],
  invoice_reminder: [{ label: "Days after invoice sent", field: "days_after", type: "number" }],
};

type ConfigForm = {
  mode: "agentic" | "supervised";
  trigger_params: Record<string, unknown>;
  ai_prompt: string;
  tone: "professional" | "casual" | "friendly";
  gmail_filter: string;
};

const DEFAULT_CONFIG: ConfigForm = {
  mode: "supervised",
  trigger_params: {},
  ai_prompt: "",
  tone: "professional",
  gmail_filter: "",
};

export function AutomationsView() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, AutomationConfig>>({});
  const [runs, setRuns] = useState<Record<string, AutomationRun[]>>({});
  const [panelKey, setPanelKey] = useState<string | null>(null);
  const [form, setForm] = useState<ConfigForm>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [automationsRes, configsRes, runsRes] = await Promise.all([
        fetch("/api/dashboard/automations").then(r => r.json()),
        fetch("/api/automations/config").then(r => r.json()),
        fetch("/api/automations/runs").then(r => r.json()),
      ]);

      if (automationsRes.automations) {
        const active = new Set<string>();
        automationsRes.automations.forEach((a: { enabled: boolean; automation_key: string }) => {
          if (a.enabled) active.add(a.automation_key);
        });
        setActiveKeys(active);
      }

      if (configsRes.configs) {
        const map: Record<string, AutomationConfig> = {};
        configsRes.configs.forEach((c: AutomationConfig) => { map[c.automation_key] = c; });
        setConfigs(map);
      }

      if (runsRes.runs) {
        const map: Record<string, AutomationRun[]> = {};
        runsRes.runs.forEach((r: AutomationRun) => {
          if (!map[r.automation_key]) map[r.automation_key] = [];
          map[r.automation_key].push(r);
        });
        setRuns(map);
      }
    } catch (err) {
      console.error("Error loading automations", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleAutomation = async (key: string, current: boolean) => {
    const nextState = !current;
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (nextState) next.add(key); else next.delete(key);
      return next;
    });
    try {
      await fetch("/api/dashboard/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: key, enabled: nextState }),
      });
    } catch {
      setActiveKeys(prev => {
        const next = new Set(prev);
        if (current) next.add(key); else next.delete(key);
        return next;
      });
    }
  };

  const openPanel = (key: string) => {
    const existing = configs[key];
    setForm(existing ? {
      mode: existing.mode,
      trigger_params: existing.trigger_params as Record<string, unknown>,
      ai_prompt: existing.ai_prompt,
      tone: existing.tone,
      gmail_filter: existing.gmail_filter,
    } : DEFAULT_CONFIG);
    setPanelKey(key);
  };

  const saveConfig = async () => {
    if (!panelKey) return;
    setSaving(true);
    try {
      await fetch("/api/automations/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: panelKey, ...form }),
      });
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!panelKey) return;
    setRunningNow(true);
    try {
      const res = await fetch("/api/automations/run-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: panelKey }),
      });
      const data = await res.json() as { success: boolean; triggered_for?: string; message?: string };
      alert(data.success ? `Triggered for: "${data.triggered_for}"` : data.message ?? "No matching email found");
      await fetchAll();
    } finally {
      setRunningNow(false);
    }
  };

  const sendRun = async (runId: string) => {
    setSending(true);
    try {
      await fetch("/api/automations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      setSelectedRun(null);
      await fetchAll();
    } finally {
      setSending(false);
    }
  };

  const filtered = AUTOMATIONS.filter(a => filter === "All" || a.category === filter);
  const panelAutomation = AUTOMATIONS.find(a => a.key === panelKey);
  const panelRuns = panelKey ? (runs[panelKey] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI rules running in the background on your behalf.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-sm font-medium">{activeKeys.size} active</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1">
        {CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => setFilter(c)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === c ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted border border-border bg-background")}>
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(automation => {
          const isActive = activeKeys.has(automation.key);
          const config = configs[automation.key];
          const runList = runs[automation.key] ?? [];
          return (
            <div key={automation.id}
              className={cn("rounded-2xl border border-border bg-background p-5 shadow-sm transition-opacity", !isActive && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="size-4 text-primary" />
                </div>
                <button type="button" onClick={() => toggleAutomation(automation.key, isActive)}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
                    isActive ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    isActive ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
              <div className="mt-3">
                <p className="font-medium text-sm">{automation.name}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{automation.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    {automation.category}
                  </span>
                  {config && (
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium",
                      config.mode === "agentic" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                      {config.mode === "agentic" ? "🤖 Agentic" : "👁️ Supervised"}
                    </span>
                  )}
                  {runList.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{runList.length} run{runList.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <button type="button" onClick={() => openPanel(automation.key)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                  <Settings className="size-3" />
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Config Slide-Over Panel */}
      {panelKey && panelAutomation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPanelKey(null)} />
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-background shadow-2xl overflow-y-auto">
            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h2 className="font-semibold text-lg">{panelAutomation.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{panelAutomation.description}</p>
              </div>
              <button type="button" onClick={() => setPanelKey(null)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 p-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enabled</span>
                <button type="button" onClick={() => toggleAutomation(panelKey, activeKeys.has(panelKey))}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    activeKeys.has(panelKey) ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                    activeKeys.has(panelKey) ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>

              {/* Mode */}
              <div>
                <label className="text-sm font-medium block mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["agentic", "supervised"] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => setForm(f => ({ ...f, mode: m }))}
                      className={cn("rounded-xl border-2 px-4 py-3 text-left transition-colors",
                        form.mode === m ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                      <p className="font-medium text-sm">{m === "agentic" ? "🤖 Agentic" : "👁️ Supervised"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m === "agentic" ? "AI sends emails automatically" : "AI drafts, you approve before sending"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger params */}
              {(TRIGGER_PARAM_FIELDS[panelKey] ?? []).map(field => (
                <div key={field.field}>
                  <label className="text-sm font-medium block mb-1.5">{field.label}</label>
                  {field.type === "number" && (
                    <input
                      type="number"
                      min={1}
                      value={(form.trigger_params[field.field] as number) ?? ""}
                      onChange={e => setForm(f => ({
                        ...f,
                        trigger_params: { ...f.trigger_params, [field.field]: Number(e.target.value) }
                      }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                  {field.type === "tags" && (
                    <input
                      type="text"
                      placeholder="pricing, budget, cost (comma-separated)"
                      value={((form.trigger_params[field.field] as string[]) ?? []).join(", ")}
                      onChange={e => setForm(f => ({
                        ...f,
                        trigger_params: { ...f.trigger_params, [field.field]: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }
                      }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
              ))}

              {/* AI Instructions */}
              <div>
                <label className="text-sm font-medium block mb-1.5">AI Instructions</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Always mention our agency name, keep replies under 3 sentences"
                  value={form.ai_prompt}
                  onChange={e => setForm(f => ({ ...f, ai_prompt: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Tone */}
              <div>
                <label className="text-sm font-medium block mb-1.5">Tone</label>
                <div className="flex gap-2">
                  {TONES.map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, tone: t }))}
                      className={cn("flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors",
                        form.tone === t ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted text-muted-foreground")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gmail filter */}
              <div>
                <label className="text-sm font-medium block mb-1.5">Gmail filter <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="label:leads or from:@company.com"
                  value={form.gmail_filter}
                  onChange={e => setForm(f => ({ ...f, gmail_filter: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Run history */}
              {panelRuns.length > 0 && (
                <div>
                  <label className="text-sm font-medium block mb-2">Run history</label>
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {panelRuns.slice(0, 10).map(run => (
                      <div key={run.id} className="flex items-center justify-between px-3 py-2.5 bg-background">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{run.trigger_email_subject ?? "—"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(run.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                            run.status === "sent" ? "bg-emerald-500/10 text-emerald-600" :
                            run.status === "held_for_review" ? "bg-amber-500/10 text-amber-600" :
                            run.status === "failed" ? "bg-red-500/10 text-red-600" :
                            "bg-muted text-muted-foreground")}>
                            {run.status.replace("_", " ")}
                          </span>
                          <button type="button" onClick={() => setSelectedRun(run)}
                            className="text-[11px] text-primary hover:underline">
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-border p-6 flex items-center gap-3">
              <button type="button" onClick={saveConfig} disabled={saving}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={runNow} disabled={runningNow}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60">
                {runningNow ? "Running…" : "Run now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run detail modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRun(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-sm">{selectedRun.trigger_email_subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedRun.trigger_email_from}</p>
              </div>
              <button type="button" onClick={() => setSelectedRun(null)}
                className="rounded-lg p-1.5 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="rounded-xl bg-muted p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {selectedRun.ai_output ?? selectedRun.error_message ?? "No output"}
            </div>
            {selectedRun.status === "held_for_review" && (
              <button type="button" onClick={() => sendRun(selectedRun.id)} disabled={sending}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                {sending ? "Sending…" : "Send this reply"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/vibeops/dashboard/automations.tsx
git commit -m "feat: full automations UI — config slide-over panel, mode badges, run history"
```

---

## Task 11: GCP Pub/Sub Setup (Manual Step)

This task requires GCP console access and cannot be automated.

- [ ] **Step 1: Create a Pub/Sub topic**

In GCP Console → Pub/Sub → Create topic: `vibeops-gmail-push`

- [ ] **Step 2: Grant Gmail publish access**

Add `gmail-api-push@system.gserviceaccount.com` as a Publisher on the topic.

- [ ] **Step 3: Create push subscription**

Create a push subscription pointing to:
```
https://your-app.com/api/webhooks/gmail
```

- [ ] **Step 4: Set env var**

```
GMAIL_PUBSUB_TOPIC=projects/YOUR_GCP_PROJECT_ID/topics/vibeops-gmail-push
```

---

## Environment Variables Summary

Add all of these to `.env.local` and production secrets:

```
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/vibeops-gmail-push
INSFORGE_SERVICE_KEY=...   # service role key from InsForge dashboard
OPENROUTER_API_KEY=...
APP_BASE_URL=https://your-app.com
```
