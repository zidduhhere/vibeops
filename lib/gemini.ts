export async function isRelevantEmail(subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Skipping email relevance check.");
    return true; // Default to true if no key is set
  }

  const prompt = `You are an AI assistant filtering emails. Determine if the following email is a genuine client inquiry, a reply from a client, or a business-relevant communication. If it is a promotional email, newsletter, spam, or automated system notification, it is NOT relevant.

Reply with ONLY the word "YES" if it is relevant, or "NO" if it is not relevant.

Subject: ${subject}
Body:
${body}`;

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 5,
        }
      })
    });

    if (!res.ok) {
        console.error("Failed to call Gemini API:", await res.text());
        return true; // default to true on error
    }

    const textRes = await res.text();
    let data;
    try {
        data = JSON.parse(textRes);
    } catch (e) {
        console.error("Gemini API returned invalid JSON (possibly HTML error page):", textRes);
        return true;
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toUpperCase() || "";
    
    return text.includes("YES");
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return true;
  }
}
