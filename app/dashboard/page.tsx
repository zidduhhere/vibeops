"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/vibeops/dashboard";
import { useAuth } from "@/lib/auth";

function DashboardContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeNav, setActiveNav] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <DashboardShell
      userName={user.name ?? user.email}
      userPicture={user.picture}
      activeNav={activeNav}
      onNavChange={setActiveNav}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
