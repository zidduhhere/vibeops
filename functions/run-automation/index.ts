// InsForge serverless function: run-automation
// Invoked by webhook or run-now with { user_id, automation_key, email_data }
// Calls OpenRouter AI, then sends (agentic) or holds (supervised)

import { createClient } from "@insforge/sdk";

// Inlined from lib/gmail-api — relative imports don't resolve in function runtime
async function refreshGmailToken(refreshToken: string): Promise<string> {
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed ${res.status}: ${text}`);
  }
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

async function getValidAccessToken(tokens: { access_token: string; refresh_token: string | null; token_expires_at: string | null }): Promise<string> {
  const expiresAt = tokens.token_expires_at ? new Date(tokens.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60_000;
  if (!isExpired) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error("No refresh token available");
  return refreshGmailToken(tokens.refresh_token);
}

async function sendGmailReply(accessToken: string, to: string, subject: string, body: string): Promise<void> {
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
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail send error ${res.status}: ${text}`);
  }
}

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
