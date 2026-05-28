import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const storedVerifier = cookieStore.get("x_oauth_verifier")?.value;
  const storedState = cookieStore.get("x_oauth_state")?.value;

  if (error || !code || state !== storedState || !storedVerifier) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&x=error", request.url)
    );
  }

  // Exchange code for tokens
  const credentials = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/x/callback`,
      code_verifier: storedVerifier,
    }),
  });

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&x=error", request.url)
    );
  }

  // Get the X handle
  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const me = await meRes.json() as { data?: { username?: string } };

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
      channel: "x",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      account_label: me.data?.username ? `@${me.data.username}` : null,
    }]);

  if (dbError) {
    return NextResponse.redirect(
      new URL("/onboarding?step=3&x=error", request.url)
    );
  }

  // Clean up PKCE cookies
  cookieStore.delete("x_oauth_verifier");
  cookieStore.delete("x_oauth_state");

  const redirectUrl = new URL("/onboarding", request.url);
  redirectUrl.searchParams.set("step", "3");
  redirectUrl.searchParams.set("x", "connected");
  if (me.data?.username) redirectUrl.searchParams.set("xLabel", `@${me.data.username}`);

  return NextResponse.redirect(redirectUrl);
}
