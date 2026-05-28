import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sub, email, name, picture } = session.user as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };

  const body = await request.json() as {
    selectedProblems: string[];
    voiceTranscript: string;
    practiceReply: string;
  };

  const insforge = await createInsForgeClient();

  // Upsert user profile
  const { error: profileError } = await insforge
    .database
    .from("user_profiles")
    .upsert([{ id: sub, email, name: name ?? null, picture: picture ?? null }]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Insert onboarding row
  const { error: onboardingError } = await insforge
    .database
    .from("onboarding")
    .insert([{
      user_id: sub,
      selected_problems: body.selectedProblems,
      voice_transcript: body.voiceTranscript,
      practice_reply: body.practiceReply,
      completed_at: new Date().toISOString(),
    }]);

  if (onboardingError) {
    return NextResponse.json({ error: onboardingError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
