import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function GET() {
  try {
    const db = await createInsForgeClient();
    
    // Fetch queue items with 'reach-out' or 'coming-up' group (if grp is used for this)
    // Actually, queue items that are followups might have a specific reason like 'Proposal follow-up due' or 'Follow-up'
    // Let's just fetch unresolved queue_items and the frontend can filter or we return all
    const { data: followups, error } = await db.database
      .from("queue_items")
      .select("*, client:clients(id, name, email, phone)")
      .eq("resolved", false)
      .in("grp", ["reach-out", "coming-up"]) // assuming these are groups used for followups
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching followups:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ followups: followups || [] });
  } catch (err: any) {
    console.error("Followups API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
