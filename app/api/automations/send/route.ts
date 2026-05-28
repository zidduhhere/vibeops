import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { getValidAccessToken, sendGmailReply } from "@/lib/gmail-api";

export async function POST(req: Request) {
  try {
    const db = await createInsForgeClient();
    const { data: { user } } = await db.auth.getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { run_id } = await req.json() as { run_id: string };
    if (!run_id) return NextResponse.json({ error: "run_id required" }, { status: 400 });

    // Fetch the run
    const { data: run, error: runErr } = await db.database
      .from("automation_runs")
      .select("*")
      .eq("id", run_id)
      .eq("user_id", user.id)
      .single();

    if (runErr || !run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    if (run.status !== "held_for_review") return NextResponse.json({ error: "Run is not held for review" }, { status: 400 });
    if (!run.ai_output) return NextResponse.json({ error: "No AI output to send" }, { status: 400 });

    // Fetch Gmail tokens
    const { data: conn } = await db.database
      .from("channel_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("channel", "gmail")
      .single();

    if (!conn) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

    const accessToken = await getValidAccessToken({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      token_expires_at: conn.token_expires_at,
    });

    await sendGmailReply(
      accessToken,
      run.trigger_email_from ?? "",
      run.trigger_email_subject ?? "",
      run.ai_output
    );

    const { error: updateErr } = await db.database
      .from("automation_runs")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", run_id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
