import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

// POST: Save WhatsApp credentials to channel_connections
// Body: { phoneNumberId: string, accessToken: string }
export async function POST(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { phoneNumberId: string; accessToken: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phoneNumberId, accessToken } = body;
  if (!phoneNumberId || !accessToken) {
    return NextResponse.json(
      { error: "phoneNumberId and accessToken are required" },
      { status: 400 }
    );
  }

  // Validate credentials by calling the Meta API
  const testRes = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!testRes.ok) {
    const errData = await testRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        error: "Invalid credentials — Meta API rejected them",
        detail: (errData as { error?: { message?: string } }).error?.message ?? `Status ${testRes.status}`,
      },
      { status: 400 }
    );
  }

  const phoneData = await testRes.json() as { display_phone_number?: string; verified_name?: string };

  const db = await createInsForgeClient();

  const { error: dbError } = await db.database
    .from("channel_connections")
    .upsert([{
      user_id:      session.user.sub,
      channel:      "whatsapp",
      access_token: accessToken,
      account_label: phoneNumberId, // store phone_number_id so webhook can route correctly
    }]);

  if (dbError) {
    console.error("[whatsapp connect]", dbError);
    return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    displayPhone: phoneData.display_phone_number,
    name: phoneData.verified_name,
  });
}
