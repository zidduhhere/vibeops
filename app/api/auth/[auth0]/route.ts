import { NextRequest, NextResponse } from "next/server";

const isAuth0Enabled = process.env.NEXT_PUBLIC_AUTH0_ENABLED === "true";

let authHandler: any;

if (isAuth0Enabled) {
  try {
    // Dynamically require to avoid crash during compile-time if Auth0 credentials are not set
    const { handleAuth } = require("@auth0/nextjs-auth0");
    authHandler = handleAuth();
  } catch (err) {
    console.error("Failed to initialize Auth0 SDK:", err);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ auth0?: string }> }
) {
  if (isAuth0Enabled && authHandler) {
    return authHandler(request, context);
  }

  // Sandbox Mode Fallback Route Handlers
  const { auth0 } = await context.params; // 'login', 'logout', 'me', etc.

  if (auth0 === "me") {
    // Return simulated sandbox user profile
    return NextResponse.json({
      email: "sandbox@vibeops.dev",
      name: "Sandbox User",
      picture: "https://avatar.vercel.sh/sandbox",
      sub: "mock|12345",
      nickname: "sandbox",
    });
  }

  if (auth0 === "login") {
    const url = new URL(request.url);
    const screenHint = url.searchParams.get("screen_hint");
    
    // Redirect to onboarding on signup screen hint, otherwise to dashboard
    const dest = screenHint === "signup" ? "/onboarding" : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (auth0 === "logout") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.json({
    message: "Auth0 Sandbox Mode is active. Set env variables to connect a live Auth0 tenant.",
    auth0Route: auth0,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ auth0?: string }> }
) {
  if (isAuth0Enabled && authHandler) {
    return authHandler(request, context);
  }

  return NextResponse.json({
    message: "Sandbox Mode is active.",
  });
}
