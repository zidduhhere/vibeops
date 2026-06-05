/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  const db = await createInsForgeClient();
  const apiKey = process.env.GEMINI_API_KEY;
  
  try {
    const { userId, conversationId, messageBody, clientEmail, sentAt } = await request.json();

    if (!conversationId || !messageBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attempt to lookup client
    let clientId = null;
    let clientTags: string[] = [];
    if (clientEmail) {
      const emailMatch = clientEmail.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : clientEmail;
      
      const { data: client } = await db.database
        .from("clients")
        .select("id, tags")
        .eq("email", email)
        .single();
      
      if (client) {
        clientId = client.id;
        clientTags = client.tags || [];
      } else {
        let name = clientEmail;
        const nameMatch = clientEmail.match(/^(.*?)\s*</);
        if (nameMatch) {
            name = nameMatch[1].replace(/"/g, '').trim();
        }
        
        const { data: newClient } = await db.database.from("clients").insert([{
          user_id: userId,
          name: name || email,
          email: email
        }]).select("id").single();
        
        if (newClient) clientId = newClient.id;
      }
    }

    if (!clientId) {
      console.warn("[ai process] Failed to resolve client_id.");
      return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
    }

    let isRelevant = true;
    let aiDraft = "Thanks for reaching out! Let me check on that and get back to you.";
    let aiSummary = "New inquiry received.";
    let status = "pending";
    let queueGroup = "ready";

    // Fetch user branding
    const { data: userProfile } = await db.database
      .from("user_profiles")
      .select("brand_identity")
      .eq("id", userId)
      .single();
    
    const brandIdentity = userProfile?.brand_identity || {};

    if (apiKey) {
      try {
        let prompt = `You are an AI assistant parsing an inbound email. 
Evaluate the following email message and extract key information.
If confidential details are required from the client to provide a good response, or if this is a new lead/inquiry, set action_type to 'needs-call'.
Also, carefully extract any contact details (name, phone, company, location, budget, preferred communication means) or services requested from the email body or signature.`;

        if (brandIdentity.tone || brandIdentity.customDirectives) {
          prompt += `\n\n=== CONVERSATIONAL BRANDING ===\n`;
          if (brandIdentity.tone) prompt += `Tone of Voice: ${brandIdentity.tone}\n`;
          if (brandIdentity.customDirectives) prompt += `Custom Directives: ${brandIdentity.customDirectives}\n`;
          prompt += `When generating an email draft, you must strictly adhere to the Tone of Voice and Custom Directives above.\n`;
        }

        if (brandIdentity.signatureName) {
          prompt += `\n\n=== VISUAL SIGNATURE ===\nIf you suggest an email reply (draft), you MUST append an HTML-formatted signature at the very end of the email draft using these details:\n`;
          prompt += `- Name: ${brandIdentity.signatureName}\n`;
          if (brandIdentity.signatureTitle) prompt += `- Title: ${brandIdentity.signatureTitle}\n`;
          if (brandIdentity.companyName) prompt += `- Company: ${brandIdentity.companyName}\n`;
          if (brandIdentity.phone) prompt += `- Phone: ${brandIdentity.phone}\n`;
          if (brandIdentity.website) prompt += `- Website: ${brandIdentity.website}\n`;
          if (brandIdentity.logoUrl) prompt += `- Logo URL: ${brandIdentity.logoUrl}\n`;
          if (brandIdentity.ctaText && brandIdentity.ctaLink) prompt += `- Call To Action: <a href="${brandIdentity.ctaLink}">${brandIdentity.ctaText}</a>\n`;
          
          prompt += `\nFormat the signature elegantly in HTML. Example structure:
<br><br>
<div style="font-family: sans-serif; display: flex; align-items: center; gap: 16px;">
  ${brandIdentity.logoUrl ? `<img src="${brandIdentity.logoUrl}" alt="Logo" width="48" style="width: 48px; object-fit: contain;">` : ''}
  <div style="font-size: 12px; color: #555;">
    <strong style="color: ${brandIdentity.brandColor || '#000'}; font-size: 14px;">${brandIdentity.signatureName}</strong><br>
    ${brandIdentity.signatureTitle ? `${brandIdentity.signatureTitle}<br>` : ''}
    ${brandIdentity.companyName ? `${brandIdentity.companyName}<br>` : ''}
    ${brandIdentity.ctaText ? `<a href="${brandIdentity.ctaLink}" style="color: ${brandIdentity.brandColor || '#000'}; font-weight: bold; margin-top: 4px; display: inline-block;">${brandIdentity.ctaText}</a>` : ''}
  </div>
</div>`;
        }

        prompt += `\n\nMessage:\n\n${messageBody}`;

        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + apiKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  is_relevant: {
                    type: "BOOLEAN",
                    description: "True if this is a relevant business inquiry or client communication. False if it is spam, a newsletter, or an automated notification."
                  },
                  summary: {
                    type: "STRING",
                    description: "A brief summary of the email if it is relevant."
                  },
                  draft: {
                    type: "STRING",
                    description: "A suggested email reply if it is relevant. Leave blank if not relevant."
                  },
                  action_type: {
                    type: "STRING",
                    description: "Must be one of: 'ignore', 'pending', or 'needs-call'. Use 'ignore' for irrelevant emails. Use 'needs-call' for new leads or if human review is needed.",
                    enum: ["ignore", "pending", "needs-call"]
                  },
                  extracted_name: {
                    type: "STRING",
                    description: "The sender's full name extracted from the email body or signature, if present."
                  },
                  extracted_phone: {
                    type: "STRING",
                    description: "The sender's phone number extracted from the email body or signature, if present."
                  },
                  extracted_company: {
                    type: "STRING",
                    description: "The sender's company name extracted from the email body or signature, if present."
                  },
                  extracted_location: {
                    type: "STRING",
                    description: "The sender's location or region, if mentioned."
                  },
                  extracted_budget: {
                    type: "STRING",
                    description: "The sender's stated budget for the project, if present."
                  },
                  communication_means: {
                    type: "STRING",
                    description: "The sender's preferred communication means (e.g., 'email', 'whatsapp', 'phone'), if specified."
                  },
                  service_requested: {
                    type: "STRING",
                    description: "A short description of the service or product the sender is inquiring about, if present."
                  }
                },
                required: ["is_relevant", "summary", "draft", "action_type"]
              }
            }
          })
        });

        if (res.ok) {
          const textRes = await res.text();
          let data;
          try {
            data = JSON.parse(textRes);
          } catch (e) {
            console.warn("[ai process] Gemini API returned invalid JSON:", textRes);
            data = null;
          }
          
          if (data) {
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const content = JSON.parse(text);
              isRelevant = content.is_relevant;
              aiDraft = content.draft || aiDraft;
              aiSummary = content.summary || aiSummary;
              if (content.action_type && ["sent", "pending", "needs-call"].includes(content.action_type)) {
                status = content.action_type;
              }
              queueGroup = status === "needs-call" ? "decisions" : "ready";

              // Magic Lead Extraction! If relevant and not ignored, update the client with extracted details
              if (isRelevant && status !== "ignore") {
                const updateData: any = {};
                if (content.extracted_name) updateData.name = content.extracted_name;
                if (content.extracted_phone) updateData.phone = content.extracted_phone;
                if (content.extracted_company) updateData.company = content.extracted_company;
                if (content.service_requested) updateData.bio = content.service_requested;
                
                // Add metadata for extra details
                const metadata: any = {};
                if (content.extracted_location) metadata.location = content.extracted_location;
                if (content.extracted_budget) metadata.budget = content.extracted_budget;
                if (content.communication_means) metadata.communication_means = content.communication_means;
                
                if (Object.keys(metadata).length > 0) {
                  updateData.metadata = metadata;
                }

                // Add the "lead" tag
                const newTags = Array.from(new Set([...(clientTags || []), "lead"]));
                updateData.tags = newTags;

                await db.database.from("clients").update(updateData).eq("id", clientId);
                clientTags = newTags; // Update local reference
              }
            }
          }
        } else {
          console.warn("[ai process] Gemini API returned error:", await res.text());
        }
      } catch (aiErr) {
        console.warn("[ai process] Failed to call Gemini API, using fallbacks:", aiErr);
      }
    } else {
      console.warn("GEMINI_API_KEY is not set. Skipping real AI processing.");
    }

    if (!isRelevant || status === "ignore") {
      console.log(`[ai process] Message ${conversationId} flagged as irrelevant. Storing as 'ignored'.`);
      status = "ignored";
    }

    let autoReply = false;
    if (clientTags.includes("tagged") && status !== "needs-call") {
      autoReply = true;
      status = "sent"; // Mark as sent since we're auto-replying
      queueGroup = "ready";
    }

    // Insert into conversations table if it doesn't exist
    const { data: existingConv } = await db.database.from("conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!existingConv) {
      await db.database.from("conversations").insert([{
        id: conversationId,
        user_id: userId,
        channel: "gmail",
        client_id: clientId,
        created_at: sentAt || new Date().toISOString(),
        updated_at: sentAt || new Date().toISOString()
      }]);
    } else {
      await db.database.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    }

    // Insert into messages table since it's relevant
    const { error: msgError } = await db.database.from("messages").insert([{
      conversation_id: conversationId,
      user_id: userId,
      from_party: "client",
      body: messageBody.substring(0, 1000), // store up to 1k chars
      sent_at: sentAt || new Date().toISOString()
    }]);

    if (msgError) {
      console.warn("[ai process] Failed to insert message:", msgError);
    }

    // Create the AI Activity
    const { data: activity, error: activityError } = await db.database
      .from("ai_activities")
      .insert([{
        user_id: userId,
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
    if (status !== "ignored") {
      const { error: queueError } = await db.database
        .from("queue_items")
        .insert([{
          user_id: userId,
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
    }

    return NextResponse.json({ success: true, activityId: activity.id, ignored: status === "ignored", autoReply, replyText: aiDraft, isRelevant: true });
  } catch (err) {
    console.error("[ai process]", err);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
