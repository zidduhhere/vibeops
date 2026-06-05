/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// ── GET: Meta webhook verification ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[whatsapp webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[whatsapp webhook] Verification failed", { mode, token });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Receive inbound WhatsApp messages ────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta sends a wrapper object — navigate to the message
  const entry    = body?.entry?.[0];
  const changes  = entry?.changes?.[0];
  const value    = changes?.value;
  const messages = value?.messages;

  // Ignore non-message events (status updates, etc.)
  if (!messages || messages.length === 0) {
    return NextResponse.json({ status: "ok" });
  }

  const db = await createInsForgeClient();

  for (const msg of messages) {
    const waMessageId  = msg.id as string;
    const fromPhone    = msg.from as string; // sender's phone number
    const msgType      = msg.type as string;

    // Only handle text messages for now
    const textBody: string =
      msgType === "text" ? (msg.text?.body ?? "") : `[${msgType} message]`;

    // 1. Dedup — skip if already processed
    const { data: existing } = await db.database
      .from("whatsapp_messages")
      .select("id")
      .eq("wa_message_id", waMessageId)
      .single();

    if (existing) continue;

    // 2. Find which channel_connection (user) owns the receiving phone number
    //    Meta sends the display_phone_number in value.metadata
    const receivingPhoneId = value?.metadata?.phone_number_id as string | undefined;

    const { data: connections } = await db.database
      .from("channel_connections")
      .select("*")
      .eq("channel", "whatsapp");

    if (!connections || connections.length === 0) {
      console.warn("[whatsapp webhook] No whatsapp connections found");
      continue;
    }

    // Match by phone_number_id stored in account_label field, or fall back to first
    const conn =
      connections.find((c: any) => c.account_label === receivingPhoneId) ??
      connections[0];

    const userId = conn.user_id as string;

    // 3. Mark as processed (dedup insert)
    await db.database
      .from("whatsapp_messages")
      .insert([{ wa_message_id: waMessageId, user_id: userId }]);

    // 4. Run through AI pipeline (same as Gmail)
    try {
      const aiRes = await fetch(`${APP_BASE_URL}/api/ai/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          conversationId: null, // AI process will create/find one
          messageBody: textBody,
          clientEmail: fromPhone, // phone acts as identifier
          sentAt: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
          channel: "whatsapp",
        }),
      });

      if (!aiRes.ok) {
        console.error("[whatsapp webhook] AI process failed", await aiRes.text());
      }
    } catch (err) {
      console.error("[whatsapp webhook] AI process error", err);
    }
  }

  // Meta expects a 200 OK quickly — always return success
  return NextResponse.json({ status: "ok" });
}
