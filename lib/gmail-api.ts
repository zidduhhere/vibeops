// Gmail REST API helpers — token refresh, send, watch registration

interface GmailTokens {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
}

export async function refreshGmailToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

export async function getValidAccessToken(tokens: GmailTokens): Promise<string> {
  const expiresAt = tokens.token_expires_at ? new Date(tokens.token_expires_at) : null;
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60_000;
  if (!isExpired) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error("No refresh token available");
  return refreshGmailToken(tokens.refresh_token);
}

export async function fetchGmailMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const msg = await res.json() as {
    id: string;
    threadId: string;
    snippet: string;
    payload?: {
      headers?: { name: string; value: string }[];
      parts?: { mimeType: string; body?: { data?: string } }[];
      body?: { data?: string };
    };
  };

  const headers = msg.payload?.headers ?? [];
  const subject = headers.find(h => h.name === "Subject")?.value ?? "(no subject)";
  const from = headers.find(h => h.name === "From")?.value ?? "";

  // Extract plain text body
  let body = "";
  const parts = msg.payload?.parts ?? [];
  const textPart = parts.find(p => p.mimeType === "text/plain");
  const rawData = textPart?.body?.data ?? msg.payload?.body?.data ?? "";
  if (rawData) {
    body = Buffer.from(rawData, "base64url").toString("utf-8");
  }

  return { id: msg.id, threadId: msg.threadId, subject, from, body, snippet: msg.snippet };
}

export async function fetchGmailHistory(
  accessToken: string,
  startHistoryId: string
): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json() as {
    history?: { messagesAdded?: { message: { id: string } }[] }[];
    historyId?: string;
  };

  const messageIds: string[] = [];
  for (const entry of data.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      messageIds.push(added.message.id);
    }
  }
  return messageIds;
}

export async function sendGmailReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<void> {
  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
  const rawMessage = [
    `To: ${to}`,
    `Subject: ${replySubject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body,
  ].join("\r\n");

  const encoded = Buffer.from(rawMessage).toString("base64url");

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded, threadId }),
  });
}

export async function registerGmailWatch(
  accessToken: string,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
      }),
    }
  );
  const data = await res.json() as { historyId?: string; expiration?: string; error?: unknown };
  if (!data.historyId) throw new Error(`Watch registration failed: ${JSON.stringify(data.error)}`);
  return {
    historyId: data.historyId,
    expiration: new Date(Number(data.expiration)).toISOString(),
  };
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
