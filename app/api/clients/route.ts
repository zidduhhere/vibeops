import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub || "default_user";
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const db = await createInsForgeClient();
    const { error } = await db.database
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Clients DELETE Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub || "default_user"; // In a real app, strictly require session
    
    const body = await request.json();
    const { name, email, channel, syncContext, tags } = body;

    if (!name || (!email && channel === 'email')) {
      return NextResponse.json({ error: "Name and Email are required for email clients" }, { status: 400 });
    }

    const db = await createInsForgeClient();
    const clientTags = tags || ["active"];

    // Insert the new client
    const { data: newClient, error } = await db.database
      .from("clients")
      .insert([{
        user_id: userId,
        name,
        email: email || null,
        tags: clientTags,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If syncContext is true and channel is email, trigger a background sync for this email
    if (syncContext && email && channel === "email") {
      // We don't await this so it happens in the background without blocking the UI
      triggerEmailSync(email, userId, newClient.id).catch(err => console.error("Background sync error:", err));
    }

    return NextResponse.json({ client: newClient });
  } catch (err: any) {
    console.error("Clients API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function triggerEmailSync(email: string, userId: string, clientId: string) {
  const db = await createInsForgeClient();
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  // Fetch active Gmail connection
  const { data: connection } = await db.database
    .from("channel_connections")
    .select("access_token")
    .eq("channel", "gmail")
    .eq("user_id", userId)
    .single();

  if (!connection?.access_token) return;

  const accessToken = connection.access_token;

  // Search for recent emails to/from this client (limit to 5 to avoid overwhelming the system)
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=${encodeURIComponent(`from:${email} OR to:${email}`)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) return;

  const data = await res.json();
  const messages = data.messages || [];

  for (const msg of messages) {
    // Check if we already processed this message
    const { data: existingMeta } = await db.database
      .from("email_metadata")
      .select("id")
      .eq("message_id", msg.id)
      .single();
      
    if (existingMeta) continue; 

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
    } else if (msgData.payload.body?.data) {
      body = Buffer.from(msgData.payload.body.data, "base64").toString("utf-8");
    }
    if (!body && msgData.snippet) body = msgData.snippet;
    if (!body) body = "No content available";

    const headers = msgData.payload.headers;
    const fromHeader = headers.find((h: any) => h.name === "From")?.value || email;
    
    let conversationId = crypto.randomUUID();
    if (msg.threadId) {
      const padded = msg.threadId.padStart(32, '0');
      conversationId = `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20)}`;
    }

    // Process via the AI endpoint to summarize and store the activity
    await fetch(`${baseUrl}/api/ai/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId,
        conversationId, 
        messageBody: body,
        clientEmail: fromHeader,
        sentAt: new Date().toISOString()
      })
    });

    // Save metadata so we don't process it again
    await db.database.from("email_metadata").insert([{
      message_id: msg.id,
      is_relevant: true // We assume it's relevant since they explicitly synced it
    }]);
  }
}
