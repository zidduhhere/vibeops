import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import type { AutomationConfig } from "@/lib/insforge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = db.database.from("automation_configs").select("*").eq("user_id", user.id);
    if (key) query = query.eq("automation_key", key);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ configs: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as Partial<AutomationConfig>;
    const { automation_key, mode, trigger_params, ai_prompt, tone, gmail_filter } = body;

    if (!automation_key) return NextResponse.json({ error: "automation_key required" }, { status: 400 });

    const { error } = await db.database
      .from("automation_configs")
      .upsert([{
        user_id: user.id,
        automation_key,
        mode: mode ?? "supervised",
        trigger_params: trigger_params ?? {},
        ai_prompt: ai_prompt ?? "",
        tone: tone ?? "professional",
        gmail_filter: gmail_filter ?? "",
        updated_at: new Date().toISOString(),
      }], { onConflict: "user_id, automation_key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
