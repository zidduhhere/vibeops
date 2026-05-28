"use client";

import { LandingScreen } from "@/components/vibeops/landing";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <LandingScreen
        onStart={() => router.push("/onboarding")}
      />
    </div>
  );
}
