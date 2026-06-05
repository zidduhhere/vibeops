"use client";

import { TodayView } from "@/components/vibeops/dashboard/today";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  return <TodayView userName={user?.name ?? user?.email} userPicture={user?.picture} />;
}
