/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { isRelevantEmail } from "@/lib/gemini";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // This route might be called by a cron job or manually.
  // In a real scenario, protect it with a secret or ensure it's from the task scheduler.
  
  const db = await createInsForgeClient();
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  
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
    let innerLoops = 0;
    let errorPoints: string[] = [];

    // 2. Sync each connection
    for (const conn of connections) {
      let accessToken = conn.access_token;
      
      // Basic check for new unread messages across all labels
      let res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (res.status === 401 && conn.refresh_token) {
        // Attempt to refresh token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GMAIL_CLIENT_ID || "",
            client_secret: process.env.GMAIL_CLIENT_SECRET || "",
            refresh_token: conn.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        
        if (tokenRes.ok) {
          const tokens = await tokenRes.json();
          accessToken = tokens.access_token;
          await db.database.from("channel_connections").update({ access_token: accessToken }).eq("id", conn.id);
          
          // Retry initial fetch
          res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread", {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        }
      }

      if (!res.ok) {
        return NextResponse.json({ error: `Gmail fetch failed: ${res.status}`, text: await res.text() });
      }

      // Ensure the VibeOpsProcessed label exists
      let vibeopsLabelId = "";
      const labelsRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (labelsRes.ok) {
        const labelsData = await labelsRes.json();
        const existingLabel = labelsData.labels?.find((l: any) => l.name === "VibeOpsProcessed");
        if (existingLabel) {
          vibeopsLabelId = existingLabel.id;
        } else {
          const createLabelRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: "VibeOpsProcessed",
              labelListVisibility: "labelShow",
              messageListVisibility: "show"
            })
          });
          if (createLabelRes.ok) {
            const newLabel = await createLabelRes.json();
            vibeopsLabelId = newLabel.id;
          }
        }
      }

      const data = await res.json();
      const messages = data.messages || [];
      if (messages.length === 0) {
        return NextResponse.json({ error: "No messages found in response", data });
      }

      for (const msg of messages) {
        innerLoops++;
        
        // 1. Check if we already processed this message in the DB
        const { data: existingMeta } = await db.database
          .from("email_metadata")
          .select("id")
          .eq("message_id", msg.id)
          .single();
          
        if (existingMeta) {
          continue; // Already processed
        }

        // Fetch full message details
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!msgRes.ok) {
           errorPoints.push("msgRes not ok: " + msgRes.status);
           continue;
        }
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

        if (!body && msgData.snippet) {
          body = msgData.snippet;
        }

        if (!body) {
           body = "No content available";
           errorPoints.push("body empty, fallback to No content");
        }

        // Try to identify client from sender email (To/From headers)
        const headers = msgData.payload.headers;
        const fromHeader = headers.find((h: any) => h.name === "From")?.value || "";
        const subjectHeader = headers.find((h: any) => h.name === "Subject")?.value || "No Subject";
        
        // const isRelevant = await isRelevantEmail(subjectHeader, body);
        // if (!isRelevant) {
        //   console.log(`[gmail sync] Skipping irrelevant email: ${subjectHeader}`);
        //   // Mark as read in Gmail (optional)
        //   await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
        //     method: "POST",
        //     headers: {
        //       Authorization: `Bearer ${accessToken}`,
        //       "Content-Type": "application/json"
        //     },
        //     body: JSON.stringify({ removeLabelIds: ["UNREAD"] })
        //   });
        //   continue;
        // }

        let conversationId = crypto.randomUUID();
        if (msg.threadId) {
          const padded = msg.threadId.padStart(32, '0');
          conversationId = `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20)}`;
        }

        const aiResponse = await fetch(`${baseUrl}/api/ai/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId: conn.user_id,
            conversationId, 
            messageBody: body,
            clientEmail: fromHeader,
            sentAt: new Date().toISOString()
          })
        });

        let isRelevant = false;

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.isRelevant !== undefined) {
            isRelevant = aiData.isRelevant;
          }
          if (aiData.autoReply && aiData.replyText) {
            const replyEmail = [
              `To: ${fromHeader}`,
              `Subject: Re: ${subjectHeader.replace(/^Re: /i, '')}`,
              `In-Reply-To: ${msg.id}`,
              `References: ${msg.id}`,
              '',
              aiData.replyText
            ].join('\n');
            
            const encodedEmail = Buffer.from(replyEmail).toString('base64url');
            
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                raw: encodedEmail,
                threadId: msg.threadId
              })
            });
            console.log(`[gmail sync] Auto-replied to priority client: ${fromHeader}`);
          }
        }

        // Save metadata
        await db.database.from("email_metadata").insert([{
          message_id: msg.id,
          is_relevant: isRelevant
        }]);

        // Mark as read in Gmail and add VibeOpsProcessed label
        const modifyPayload: any = { removeLabelIds: ["UNREAD"] };
        if (vibeopsLabelId) {
          modifyPayload.addLabelIds = [vibeopsLabelId];
        }

        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(modifyPayload)
        });

        processedCount++;
      }
    }

    return NextResponse.json({ success: true, processedCount, innerLoops, errorPoints });
  } catch (err) {
    console.error("[gmail sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
