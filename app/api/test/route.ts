import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET() {
  const db = await createInsForgeClient();
  const session = await auth0.getSession();
  
  if (!session?.user?.sub) return NextResponse.json({ error: "No session" });

  const { data: connections } = await db.database
    .from("channel_connections")
    .select("id, access_token, refresh_token")
    .eq("user_id", session.user.sub)
    .eq("channel", "gmail")
    .limit(1);

  const conn = connections?.[0];
  if (!conn) return NextResponse.json({ error: "No connection" });

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

  const json = await tokenRes.json();
  return NextResponse.json({ ok: tokenRes.ok, status: tokenRes.status, response: json, env_exists: !!process.env.GMAIL_CLIENT_ID });
}
