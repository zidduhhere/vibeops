import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function GET() {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub || "default_user";

    const db = await createInsForgeClient();
    const { data: profile, error } = await db.database
      .from("user_profiles")
      .select("brand_identity")
      .eq("id", userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ brandIdentity: profile?.brand_identity || {} });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub || "default_user";
    const { brandIdentity } = await request.json();

    const db = await createInsForgeClient();

    const { data: existingProfile } = await db.database
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    let result;
    if (existingProfile) {
      result = await db.database
        .from("user_profiles")
        .update({ brand_identity: brandIdentity })
        .eq("id", userId);
    } else {
      result = await db.database
        .from("user_profiles")
        .insert([{ id: userId, brand_identity: brandIdentity }]);
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
