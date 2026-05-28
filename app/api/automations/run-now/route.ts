import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { getValidAccessToken, fetchGmailMessage } from "@/lib/gmail-api";
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

    // Fetch latest messages from inbox
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
        const { error: fnErr } = await db.functions.invoke("run-automation", {
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
        if (fnErr) return NextResponse.json({ error: String(fnErr) }, { status: 500 });
        return NextResponse.json({ success: true, triggered_for: email.subject });
      }
    }

    return NextResponse.json({ success: false, message: "No matching email found in last 5 inbox messages" });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
