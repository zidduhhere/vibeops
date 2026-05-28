"use client";

import {
  ArrowRight,
  Play,
  Sparkle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const DotGrid = dynamic(() => import("@/components/DotGrid"), { ssr: false });

export function LandingHero({
  onStart,
  onWatchDemo,
}: {
  onStart: () => void;
  onWatchDemo: () => void;
}) {
  return (
    <section className="relative overflow-hidden py-24 md:py-36 min-h-[85vh] flex items-center justify-center isolate">


      {/* DotGrid background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <DotGrid
          dotSize={4}
          gap={22}
          baseColor="#c026d3"
          activeColor="#e879f9"
          proximity={120}
          shockRadius={220}
          shockStrength={4}
          resistance={750}
          returnDuration={1.5}
          className="opacity-40"
        />
      </div>

      {/* Fade edges into background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_50%_50%,transparent_30%,hsl(var(--background))_100%)]" />
      <div className="absolute inset-0 -z-15 bg-[radial-gradient(45rem_50rem_at_top,var(--color-primary-foreground),transparent)] opacity-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-15 size-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />

      <div className="mx-auto w-full px-12 z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          <Badge className="bg-secondary/80 text-secondary-foreground border border-border/60 hover:bg-secondary py-1.5 px-4 mx-auto w-fit">
            <Sparkle className="size-3.5 mr-1.5 text-primary fill-primary animate-pulse" />
            Built for solo developers who sell through conversation
          </Badge>
          
          <h1 className="text-5xl font-extrabold tracking-[-0.035em] text-foreground leading-[1.05] sm:text-6xl lg:text-7xl max-w-3xl mx-auto">
            Your AI command center for client communication.
          </h1>
          
          <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            VibeOps connects your client channels—WhatsApp, Gmail, Outlook,
            Notion, and Instagram—into a single workspace. Draft replies in
            your personal voice, screen for scope creep, and automate nudges.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 w-full">
            <Button size="lg" onClick={onStart}>
              Get Started for Free
              <ArrowRight className="size-4 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onWatchDemo}
              className="bg-card hover:bg-muted/40 transition-colors"
            >
              <Play className="size-4 mr-2" />
              Watch Video Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6 border-t border-border/40 w-full max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span>No auto-send without approval</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0" />
              <span>Connect tools when ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
