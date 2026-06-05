import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/onboarding";
  const stateObj = { sub: session.user.sub, returnTo };
  const stateStr = Buffer.from(JSON.stringify(stateObj)).toString("base64");

  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID!,
    redirect_uri: `${process.env.APP_BASE_URL}/api/integrations/gmail/callback`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: stateStr,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
