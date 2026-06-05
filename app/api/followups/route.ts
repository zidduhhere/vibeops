import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub || "default_user";
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Followup ID is required" }, { status: 400 });
    }

    const db = await createInsForgeClient();
    const { error } = await db.database
      .from("queue_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting followup:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Followups DELETE Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub || "default_user"; 
    
    const body = await request.json();
    const { clientId, dueDate, channel, notes } = body;

    if (!clientId || !dueDate) {
      return NextResponse.json({ error: "Client and Due Date are required" }, { status: 400 });
    }

    const db = await createInsForgeClient();

    // The AI uses the queue_items table to track tasks and follow-ups.
    const { data: queueItem, error } = await db.database
      .from("queue_items")
      .insert([{
        user_id: userId,
        client_id: clientId,
        grp: "decisions", // Needs to be processed by the AI
        due_date: dueDate,
        reason: `Manual Follow-up: ${notes || "No notes provided."} (Channel: ${channel})`,
        resolved: false
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating followup:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ followup: queueItem });
  } catch (err: any) {
    console.error("Followups API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
