import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  const db = await createInsForgeClient();
  
  try {
    const { userId, conversationId, messageBody, clientEmail } = await request.json();

    if (!conversationId || !messageBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attempt to lookup client
    let clientId = null;
    if (clientEmail) {
      const { data: client } = await db.database
        .from("clients")
        .select("id")
        .eq("email", clientEmail)
        .single();
      
      if (client) {
        clientId = client.id;
      }
    }

    // Call the InsForge AI Gateway to generate a draft and summary
    // This is an example fetch to an OpenAI-compatible endpoint in InsForge
    let aiDraft = "Thanks for reaching out! Let me check on that and get back to you.";
    let aiSummary = "New inquiry received.";
    let status = "pending";
    let queueGroup = "ready";

    try {
      // In InsForge, you can use the AI gateway REST API or edge function:
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_INSFORGE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an AI assistant parsing an email. Respond with a JSON object containing: { summary: 'brief summary', draft: 'suggested email reply', action_type: 'pending|needs-call' }"
            },
            {
              role: "user",
              content: messageBody
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (aiResponse.ok) {
        const result = await aiResponse.json();
        const content = JSON.parse(result.choices[0].message.content);
        aiDraft = content.draft || aiDraft;
        aiSummary = content.summary || aiSummary;
        status = content.action_type || status;
        queueGroup = status === "needs-call" ? "decisions" : "ready";
      } else {
        console.warn("[ai process] AI Gateway returned non-OK response, using fallbacks.");
      }
    } catch (aiErr) {
      console.warn("[ai process] Failed to call AI gateway, using fallbacks:", aiErr);
    }

    // Create the AI Activity
    const { data: activity, error: activityError } = await db.database
      .from("ai_activities")
      .insert([{
        channel: "Gmail",
        status,
        summary: aiSummary,
        client_message: messageBody,
        ai_draft: aiDraft,
        acted_at: new Date().toISOString(),
        client_id: clientId,
        conversation_id: conversationId,
      }])
      .select()
      .single();

    if (activityError || !activity) {
      throw new Error(`Failed to create activity: ${activityError?.message}`);
    }

    // Create the Queue Item
    const { error: queueError } = await db.database
      .from("queue_items")
      .insert([{
        grp: queueGroup,
        reason: "New inbound message requires attention.",
        due_date: new Date().toISOString().split("T")[0],
        client_id: clientId,
        activity_id: activity.id,
        resolved: false
      }]);

    if (queueError) {
      throw new Error(`Failed to create queue item: ${queueError.message}`);
    }

    return NextResponse.json({ success: true, activityId: activity.id });
  } catch (err) {
    console.error("[ai process]", err);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
