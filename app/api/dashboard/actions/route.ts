import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { actionType, activityId } = await request.json();
  if (!actionType || !activityId) {
    return NextResponse.json({ error: "Missing actionType or activityId" }, { status: 400 });
  }

  const db = await createInsForgeClient();

  try {
    if (actionType === "approve_draft") {
      // Set activity status to sent
      await db.database
        .from("ai_activities")
        .update({ status: "sent", acted_at: new Date().toISOString() })
        .eq("id", activityId);

      // Resolve associated queue item
      await db.database
        .from("queue_items")
        .update({ resolved: true })
        .eq("activity_id", activityId);
        
      // TODO: Here you would ideally call the Gmail API to actually send the drafted email.
    } else if (actionType === "dismiss_alert") {
      await db.database
        .from("queue_items")
        .update({ resolved: true })
        .eq("activity_id", activityId);
    } else if (actionType === "edit_draft") {
      // For edit_draft, we might not update status until it's sent.
      // Handled primarily on the client side before calling approve_draft.
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dashboard/actions]", err);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
