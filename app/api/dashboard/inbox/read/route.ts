import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const db = await createInsForgeClient();

    const { error } = await db.database
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);

    if (error) {
      console.error("Error updating read status:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Read API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
