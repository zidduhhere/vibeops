import { NextRequest, NextResponse } from "next/server";
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
  // Validate webhook secret to prevent unauthorized triggers
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: true }); // ack but ignore — don't leak 401
  }

  try {
    const body = await req.json() as PubSubMessage;
    const decoded = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf-8")) as {
      emailAddress: string;
      historyId: string;
    };

    const { emailAddress, historyId } = decoded;
    if (!emailAddress || !historyId) return NextResponse.json({ ok: true }); // ack invalid

    // Use service-level InsForge client — no Auth0 session in webhook context
    const { createClient } = await import("@insforge/sdk");
    const serviceDb = createClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: process.env.INSFORGE_SERVICE_KEY!,
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
