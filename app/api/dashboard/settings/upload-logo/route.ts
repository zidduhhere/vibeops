import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";
import { auth0 } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession();
    const userId = session?.user?.sub;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const db = await createInsForgeClient();
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    const { data, error } = await db.storage
      .from("brand_assets")
      .upload(fileName, file);

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.url) {
      return NextResponse.json({ error: "No URL returned" }, { status: 500 });
    }

    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
