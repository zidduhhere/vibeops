"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingScreen } from "@/components/vibeops/pricing";
import { TopBar } from "@/components/vibeops/top-bar";
import type { PlanId } from "@/components/vibeops/types";

export default function PricingPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("solo");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <TopBar onDashboard={() => router.push("/dashboard")} />
      <PricingScreen
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        onDashboard={() => router.push("/dashboard")}
      />
    </div>
  );
}
