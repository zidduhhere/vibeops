import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const stateStr = searchParams.get("state");
  let sub = "";
  let returnTo = "/onboarding";
  
  if (stateStr) {
    try {
      const decoded = JSON.parse(Buffer.from(stateStr, "base64").toString("utf-8"));
      sub = decoded.sub;
      returnTo = decoded.returnTo || "/onboarding";
    } catch (e) {
      sub = stateStr;
    }
  }

  if (error || !code) {
    const errUrl = new URL(returnTo, request.url);
    errUrl.searchParams.set("gmail", "error");
    return NextResponse.redirect(errUrl);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/gmail/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&gmail=error", request.url)
    );
  }

  // Get the user's Gmail address
  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const profile = await profileRes.json() as { email?: string };

  const session = await auth0.getSession();
  if (!session?.user || (sub && session.user.sub !== sub)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const insforge = await createInsForgeClient();

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error: dbError } = await insforge
    .database
    .from("channel_connections")
    .upsert([{
      user_id: session.user.sub,
      channel: "gmail",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      account_label: profile.email ?? null,
    }]);

  if (dbError) {
    const errUrl = new URL(returnTo, request.url);
    errUrl.searchParams.set("gmail", "error");
    return NextResponse.redirect(errUrl);
  }

  // Register Gmail Push Notification watch
  try {
    const { registerGmailWatch } = await import("@/lib/gmail-api");
    const watch = await registerGmailWatch(
      tokens.access_token,
      process.env.GMAIL_PUBSUB_TOPIC!
    );

    await insforge.database
      .from("gmail_watches")
      .upsert([{
        user_id: session.user.sub,
        history_id: watch.historyId,
        expiration: watch.expiration,
        updated_at: new Date().toISOString(),
      }], { onConflict: "user_id" });
  } catch (watchErr) {
    console.error("Failed to register Gmail watch:", watchErr);
    // Non-fatal — app still works, automations just won't fire in real-time
  }

  const redirectUrl = new URL(returnTo, request.url);
  if (returnTo.includes("/onboarding")) {
    redirectUrl.searchParams.set("step", "3");
  }
  redirectUrl.searchParams.set("gmail", "connected");
  if (profile.email) redirectUrl.searchParams.set("gmailLabel", profile.email);

  return NextResponse.redirect(redirectUrl);
}
