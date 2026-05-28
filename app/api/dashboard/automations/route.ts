import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function GET() {
  try {
    const db = await createInsForgeClient();
    
    const { data: automations, error } = await db.database
      .from("user_automations")
      .select("*");

    if (error) {
      console.error("Error fetching automations:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ automations: automations || [] });
  } catch (err: any) {
    console.error("Automations API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await createInsForgeClient();
    const { automation_key, enabled } = await req.json();

    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await db.database
      .from("user_automations")
      .upsert({ 
        user_id: user.id, 
        automation_key, 
        enabled,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id, automation_key" });

    if (error) {
      console.error("Error updating automation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Automations API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
