import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function POST() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await createInsForgeClient();

  const { error } = await db.database
    .from("channel_connections")
    .delete()
    .eq("user_id", session.user.sub)
    .eq("channel", "whatsapp");

  if (error) {
    console.error("[whatsapp disconnect]", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
