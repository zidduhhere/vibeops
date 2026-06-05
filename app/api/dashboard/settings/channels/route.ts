import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insforge = await createInsForgeClient();
    
    const { data: connections, error } = await insforge
      .database
      .from("channel_connections")
      .select("channel, account_label")
      .eq("user_id", session.user.sub);

    if (error) {
      console.error("Error fetching channels:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connections: connections || [] });
  } catch (err: any) {
    console.error("Exception fetching channels:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
