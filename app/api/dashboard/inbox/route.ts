import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET() {
  try {
    const db = await createInsForgeClient();
    const session = await auth0.getSession();
    
    // Fetch conversations and their latest messages
    const { data: conversations, error } = await db.database
      .from("conversations")
      .select(`
        id,
        channel,
        created_at,
        updated_at,
        client:clients(id, name, email, phone)
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // For a real inbox, we would fetch the last message for each conversation
    // and format it for the frontend
    const inboxItems = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        const { data: messages } = await db.database
          .from("messages")
          .select("id, body, sent_at, from_party")
          .eq("conversation_id", conv.id)
          .order("sent_at", { ascending: false })
          .limit(1);
          
        return {
          ...conv,
          latest_message: messages && messages.length > 0 ? messages[0] : null
        };
      })
    );

    // Fetch dynamic Gmail emails if connected
    let gmailItems: any[] = [];
    if (session?.user?.sub) {
      const { data: connections } = await db.database
        .from("channel_connections")
        .select("access_token")
        .eq("user_id", session.user.sub)
        .eq("channel", "gmail")
        .limit(1);

      const conn = connections?.[0];
      if (conn?.access_token) {
        try {
          const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox", {
            headers: { Authorization: `Bearer ${conn.access_token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            const messages = data.messages || [];
            
            for (const msg of messages) {
              const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${conn.access_token}` }
              });
              if (!msgRes.ok) continue;
              const msgData = await msgRes.json();
              
              const snippet = msgData.snippet || "";
              const headers = msgData.payload.headers;
              const subject = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
              const from = headers.find((h: any) => h.name === "From")?.value || "Unknown Sender";
              const dateStr = headers.find((h: any) => h.name === "Date")?.value;
              const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
              
              const isUnread = msgData.labelIds?.includes("UNREAD") ?? false;
              
              let clientName = from;
              const nameMatch = from.match(/^(.*?)\s*</);
              if (nameMatch) {
                  clientName = nameMatch[1].replace(/"/g, '').trim();
              }

              gmailItems.push({
                id: `gmail-${msg.id}`,
                channel: "gmail",
                status: isUnread ? "draft" : "handled",
                created_at: date,
                updated_at: date,
                client: { name: clientName },
                latest_message: { body: snippet, subject: subject }
              });
            }
          }
        } catch (gmailErr) {
          console.error("Error fetching dynamic Gmail emails:", gmailErr);
        }
      }
    }

    const allItems = [...inboxItems, ...gmailItems];
    allItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({ threads: allItems });
  } catch (err: any) {
    console.error("Inbox API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
