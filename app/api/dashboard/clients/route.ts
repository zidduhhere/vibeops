import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function GET() {
  try {
    const db = await createInsForgeClient();
    
    // Fetch clients with 'active' tag
    const { data: clients, error } = await db.database
      .from("clients")
      .select("*")
      .contains("tags", ["active"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching clients:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: clients || [] });
  } catch (err: any) {
    console.error("Clients API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
