import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&gmail=error", request.url)
    );
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
  if (!session?.user) {
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
    return NextResponse.redirect(
      new URL("/onboarding?step=3&gmail=error", request.url)
    );
  }

  const redirectUrl = new URL("/onboarding", request.url);
  redirectUrl.searchParams.set("step", "3");
  redirectUrl.searchParams.set("gmail", "connected");
  if (profile.email) redirectUrl.searchParams.set("gmailLabel", profile.email);

  return NextResponse.redirect(redirectUrl);
}
