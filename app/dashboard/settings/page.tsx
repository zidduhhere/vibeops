"use client";

import { SettingsView } from "@/components/vibeops/dashboard/settings";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  return <SettingsView userName={user?.name ?? user?.email} userPicture={user?.picture} />;
}
