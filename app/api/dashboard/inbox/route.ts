/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const */
import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";
import { isRelevantEmail } from "@/lib/gemini";

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
        client:clients(id, name, email, phone, tags)
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
          .select("id, body, sent_at, from_party, is_read")
          .eq("conversation_id", conv.id)
          .order("sent_at", { ascending: false })
          .limit(1);
          
        const { data: activities } = await db.database
          .from("ai_activities")
          .select("status, ai_draft")
          .eq("conversation_id", conv.id)
          .order("acted_at", { ascending: false })
          .limit(1);
          
        return {
          ...conv,
          status: activities && activities.length > 0 ? activities[0].status : null,
          ai_draft: activities && activities.length > 0 ? activities[0].ai_draft : null,
          latest_message: messages && messages.length > 0 ? messages[0] : null
        };
      })
    );

    // Client side now handles triggering the sync so it can display a loading state.

    const allItems = [...inboxItems];
    allItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({ threads: allItems });
  } catch (err: any) {
    console.error("Inbox API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
