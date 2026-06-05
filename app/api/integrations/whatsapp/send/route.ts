import { NextRequest, NextResponse } from "next/server";

// Send a WhatsApp message via Meta Cloud API
// Body: { to: string, text: string, phoneNumberId?: string, accessToken?: string }
export async function POST(request: NextRequest) {
  let body: { to: string; text: string; phoneNumberId?: string; accessToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { to, text } = body;
  if (!to || !text) {
    return NextResponse.json({ error: "Missing 'to' or 'text'" }, { status: 400 });
  }

  // Use per-connection credentials if provided, otherwise fall back to env vars
  const phoneNumberId = body.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = body.accessToken   ?? process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json(
      { error: "WhatsApp not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to .env.local" },
      { status: 503 }
    );
  }

  const waRes = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    }
  );

  if (!waRes.ok) {
    const errText = await waRes.text();
    console.error("[whatsapp send] Meta API error", waRes.status, errText);
    return NextResponse.json(
      { error: `Meta API error: ${waRes.status}`, detail: errText },
      { status: 502 }
    );
  }

  const result = await waRes.json();
  return NextResponse.json({ success: true, messageId: result.messages?.[0]?.id });
}
