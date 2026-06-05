/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createInsForgeClient } from "@/lib/insforge";

export async function GET() {
  try {
    const db = await createInsForgeClient();
    
    // Fetch clients with 'lead' tag
    const { data: leads, error } = await db.database
      .from("clients")
      .select("*")
      .contains("tags", ["lead"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: leads || [] });
  } catch (err: any) {
    console.error("Leads API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
