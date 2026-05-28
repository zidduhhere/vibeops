import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { fetchTodayData } from "@/lib/dashboard-data";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchTodayData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[dashboard/today]", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
