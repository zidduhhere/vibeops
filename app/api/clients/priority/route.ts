import { NextRequest, NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function POST(request: NextRequest) {
  const db = await createInsForgeClient();
  
  try {
    const { clientId, tagged } = await request.json();

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    // Get current tags
    const { data: client, error: fetchError } = await db.database
      .from("clients")
      .select("tags")
      .eq("id", clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let tags = client.tags || [];
    if (tagged) {
      if (!tags.includes("tagged")) tags.push("tagged");
    } else {
      tags = tags.filter((t: string) => t !== "tagged");
    }

    const { error } = await db.database
      .from("clients")
      .update({ tags })
      .eq("id", clientId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, tags });
  } catch (err) {
    console.error("[priority client]", err);
    return NextResponse.json({ error: "Failed to update priority" }, { status: 500 });
  }
}
