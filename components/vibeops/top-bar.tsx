"use client";

import { Button } from "@/components/ui/button";

export function TopBar({ onDashboard }: { onDashboard?: () => void }) {
  return (
    <header className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <img 
          src="/product-logo.svg" 
          alt="VibeOps Logo" 
          className="size-8 object-contain" 
        />
        <div>
          <p className="text-sm font-semibold tracking-[0.08em] text-foreground uppercase">
            VibeOps
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Client communication command center
          </p>
        </div>
      </div>
    </header>
  );
}
