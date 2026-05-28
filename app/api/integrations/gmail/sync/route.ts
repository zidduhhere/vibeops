import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  // This route might be called by a cron job or manually.
  // In a real scenario, protect it with a secret or ensure it's from the task scheduler.
  
  const db = await createInsForgeClient();
  
  try {
    // 1. Fetch all active Gmail connections
    const { data: connections, error } = await db.database
      .from("channel_connections")
      .select("*")
      .eq("channel", "gmail");

    if (error || !connections) {
      throw new Error("Failed to fetch connections");
    }

    let processedCount = 0;

    // 2. Sync each connection
    for (const conn of connections) {
      const accessToken = conn.access_token;
      
      // Basic check for new messages in inbox
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread in:inbox", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        // If unauthorized, we should attempt to refresh token using refresh_token
        // For simplicity in this mockup, we'll log and skip
        console.warn(`[gmail sync] Failed to fetch for user ${conn.user_id}, status: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const messages = data.messages || [];

      for (const msg of messages) {
        // Fetch full message details
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!msgRes.ok) continue;
        const msgData = await msgRes.json();
        
        // Extract text body
        let body = "";
        if (msgData.payload.parts) {
          const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart && textPart.body.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        } else if (msgData.payload.body.data) {
          body = Buffer.from(msgData.payload.body.data, "base64").toString("utf-8");
        }

        if (!body) continue;

        // Try to identify client from sender email (To/From headers)
        const headers = msgData.payload.headers;
        const fromHeader = headers.find((h: any) => h.name === "From")?.value || "";
        
        // Save to messages table.
        // We'd look up the conversation_id or create a new one based on threading.
        // As a simplification, we'll create a new conversation and trigger AI process.
        
        const conversationId = crypto.randomUUID();
        
        await db.database.from("messages").insert([{
          conversation_id: conversationId,
          from_party: "client",
          body: body.substring(0, 1000), // store up to 1k chars for now
          sent_at: new Date().toISOString()
        }]);

        // 3. Trigger the AI Processing for this new message
        // Instead of doing it inline, we could use Edge Functions or call our other route.
        // Here we'll just call the AI process route internally to avoid a network roundtrip,
        // but passing it as an HTTP call for isolation if preferred.
        await fetch(`${process.env.APP_BASE_URL}/api/ai/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: conn.user_id,
            conversationId, 
            messageBody: body,
            clientEmail: fromHeader
          })
        });

        // Mark as read in Gmail (optional)
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ removeLabelIds: ["UNREAD"] })
        });

        processedCount++;
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (err) {
    console.error("[gmail sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
