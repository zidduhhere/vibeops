import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insforge = await createInsForgeClient();
    
    const { error } = await insforge
      .database
      .from("channel_connections")
      .delete()
      .eq("user_id", session.user.sub)
      .eq("channel", "gmail");

    if (error) {
      console.error("Error disconnecting Gmail:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Exception disconnecting Gmail:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
