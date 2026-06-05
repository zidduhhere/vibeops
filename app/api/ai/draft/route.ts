import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const { subject, body, tone, conversationId } = await request.json();

    const toneInstruction = tone 
      ? `Write the reply specifically using a **${tone}** tone.` 
      : "Write a professional, concise email reply.";

    const prompt = `You are a helpful business assistant. ${toneInstruction} 
Reply to the following client message.
If they are asking a question, answer it generally or say you will look into it.
Keep it under 3-4 sentences.

Subject: ${subject}
Client Message:
${body}

Draft Reply:`;

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!res.ok) {
      console.error("Failed to generate draft:", await res.text());
      return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
    }

    const textRes = await res.text();
    let data;
    try {
      data = JSON.parse(textRes);
    } catch (e) {
      return NextResponse.json({ error: "Invalid response from Gemini" }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Could not generate a draft.";

    // Save the generated draft to the database if we have a conversationId
    if (conversationId) {
      const db = await createInsForgeClient();
      
      // Get the latest ai_activities for this conversation
      const { data: activity } = await db.database
        .from("ai_activities")
        .select("id")
        .eq("conversation_id", conversationId)
        .order("acted_at", { ascending: false })
        .limit(1)
        .single();
        
      if (activity) {
        await db.database
          .from("ai_activities")
          .update({ ai_draft: text })
          .eq("id", activity.id);
      }
    }

    return NextResponse.json({ draft: text });
  } catch (error) {
    console.error("Draft generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
