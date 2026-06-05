import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const { messages } = await request.json();

    const formattedMessages = messages.map((m: any) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
            parts: [{ text: "You are the AI Assistant for a business CRM platform called VibeOps. You are a helpful, concise, and professional digital assistant. Keep answers reasonably short." }]
        },
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!res.ok) {
      console.error("Failed to generate chat response:", await res.text());
      return NextResponse.json({ error: "Failed to generate chat response" }, { status: 500 });
    }

    const textRes = await res.text();
    let data;
    try {
      data = JSON.parse(textRes);
    } catch (e) {
      return NextResponse.json({ error: "Invalid response from Gemini" }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Chat generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
