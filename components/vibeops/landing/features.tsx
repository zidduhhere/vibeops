"use client";

/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import { useEffect, useRef, useState } from "react";
import { Inbox, MessageSquare, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const featureList = [
  {
    id: "inbox",
    tabLabel: "Unified Client Inbox",
    tabDesc: "Gmail, WhatsApp, and Instagram in one place",
    title: "Everything in one queue",
    description: "VibeOps consolidates client communication across email, chat, and task managers. You get a single, organized queue of items needing your review—no more notifications scattered across five apps.",
    tag: "INBOX AGGREGATION",
    icon: Inbox,
    btnText: "Configure channels",
  },
  {
    id: "drafts",
    tabLabel: "Tone-Matched AI Drafts",
    tabDesc: "Response suggestions customized to your voice",
    title: "Draft replies in your style",
    description: "Our AI scans your project context and past conversations to draft natural, context-aware responses. Refine them in one click to be Warmer, Shorter, or Direct depending on the client situation.",
    tag: "AI RESPONSE WRITER",
    icon: MessageSquare,
    btnText: "Train voice model",
  },
  {
    id: "scope",
    tabLabel: "Automatic Scope Guard",
    tabDesc: "Instantly detect unpaid extra requests",
    title: "Protect your contract boundaries",
    description: "When clients ask for additions ('Can you also add automatic SMS notifications?'), VibeOps highlights the request in red, links to your Notion scope document, and drafts a friendly boundary response.",
    tag: "SCOPE CREEP DETECTOR",
    icon: AlertTriangle,
    btnText: "Define project scope",
  },
  {
    id: "followups",
    tabLabel: "Low-Pressure Follow-Ups",
    tabDesc: "Nudge proposals and get assets on time",
    title: "Follow up without sounding desperate",
    description: "Never lose track of a proposal. VibeOps monitors when proposals are opened and schedules low-pressure, friendly follow-ups that keep project timelines moving forward automatically.",
    tag: "SMART REMINDERS",
    icon: Clock,
    btnText: "Schedule a nudge",
  }
];

export function FeaturesSection({ onStart }: { onStart: () => void }) {
  const [activeFeature, setActiveFeature] = useState(0);
  const scrollSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollSectionRef.current) return;
      const rect = scrollSectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollRange = rect.height - viewportHeight;
      if (totalScrollRange <= 0) return;
      
      const currentScroll = -rect.top;
      const rawProgress = currentScroll / totalScrollRange;
      const progress = Math.min(Math.max(rawProgress, 0), 1);
      
      // Map progress to active feature index (0 to 3)
      if (progress < 0.25) {
        setActiveFeature(0);
      } else if (progress < 0.5) {
        setActiveFeature(1);
      } else if (progress < 0.75) {
        setActiveFeature(2);
      } else {
        setActiveFeature(3);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section id="features" ref={scrollSectionRef} className="relative h-[250vh] bg-background text-foreground">
      <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden px-12">
        <div className="mx-auto w-full">
        
        {/* Section titles */}
        <div className="max-w-3xl mb-16 space-y-4">
          <Badge variant="secondary">Core Features</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            Built for the solo developer's sanity.
          </h2>
          <p className="text-lg text-muted-foreground">
            VibeOps features help you set clean borders with clients without sounding confrontational.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-start">
          
          {/* LEFT COLUMN: ACTIVE FEATURE VIEWPORT DETAIL WIDGET */}
          <div className="relative">
            {/* Outer decorative card shadow gradient */}
            <div className="absolute inset-0 bg-linear-to-r from-primary/10 to-purple-500/10 rounded-3xl blur-xl -z-10" />

            <Card className="border-border/80 bg-card p-6 shadow-xl space-y-6 min-h-[460px] flex flex-col justify-between">
              
              {/* Header detail */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-muted text-xs border-border text-muted-foreground font-semibold px-2.5 py-0.5">
                    {featureList[activeFeature].tag}
                  </Badge>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    {(() => {
                      const IconComp = featureList[activeFeature].icon;
                      return <IconComp className="size-5" />;
                    })()}
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  {featureList[activeFeature].title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {featureList[activeFeature].description}
                </p>
              </div>

              {/* FEATURE VISUAL PREVIEW WIDGET */}
              <div className="bg-muted/40 rounded-xl border border-border p-4 h-[180px] flex items-center justify-center overflow-hidden">
                
                {/* FEATURE 1 PREVIEW: Unified Inbox */}
                {featureList[activeFeature].id === "inbox" && (
                  <div className="w-full space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-border/80">
                      <span className="font-semibold text-foreground">WhatsApp inbox queue</span>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] py-0 px-1.5 font-medium">3 unread</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-border/80">
                      <span className="font-semibold text-foreground">Gmail client threads</span>
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] py-0 px-1.5 font-medium">5 active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-border/80 opacity-75">
                      <span className="font-semibold text-foreground">Instagram messages</span>
                      <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[9px] py-0 px-1.5 font-medium">0 active</Badge>
                    </div>
                  </div>
                )}

                {/* FEATURE 2 PREVIEW: Tone composer */}
                {featureList[activeFeature].id === "drafts" && (
                  <div className="w-full space-y-3">
                    <div className="flex items-center gap-1 bg-card border border-border/60 p-1 rounded-lg w-fit mx-auto text-[10px] font-semibold text-muted-foreground">
                      <span className="bg-primary/10 text-primary py-0.5 px-2 rounded-md">Warm</span>
                      <span className="py-0.5 px-2">Short</span>
                      <span className="py-0.5 px-2">Direct</span>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3 text-[11px] leading-relaxed text-foreground italic shadow-sm text-center">
                      "Hi Ananya, I wanted to check in. Let me know if you need any adjustments to the milestones..."
                    </div>
                  </div>
                )}

                {/* FEATURE 3 PREVIEW: Scope Guard */}
                {featureList[activeFeature].id === "scope" && (
                  <div className="w-full max-w-xs bg-red-500/5 border border-red-500/20 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <AlertTriangle className="size-3 text-red-500 shrink-0" />
                        Boundary warning
                      </span>
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] py-0">Out of Scope</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-sans line-clamp-2">
                      Client requested: <strong className="text-foreground underline underline-offset-2">"automatic trainer assignment"</strong>. Not found in approved contract.
                    </p>
                  </div>
                )}

                {/* FEATURE 4 PREVIEW: Smart reminders */}
                {featureList[activeFeature].id === "followups" && (
                  <div className="w-full space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between border-b border-border/40 pb-1.5 text-muted-foreground font-semibold">
                      <span>Lead Name</span>
                      <span>Nudge Trigger</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Aster Legal</span>
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Clock className="size-3" /> Due Today
                      </span>
                    </div>
                    <div className="flex items-center justify-between opacity-80">
                      <span>Mooncart Studio</span>
                      <span className="text-muted-foreground">Tomorrow, 10 AM</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Action button */}
              <Button onClick={onStart} className="w-full flex items-center justify-center gap-2 group h-11">
                <span>{featureList[activeFeature].btnText}</span>
                <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          </div>

          {/* RIGHT COLUMN: FEATURE SELECTOR LIST */}
          <div className="space-y-4">
            {featureList.map((feature, idx) => {
              const active = activeFeature === idx;
              return (
                <div
                  key={feature.id}
                  className={cn(
                    "group p-5 rounded-2xl border transition-all duration-200 cursor-default flex items-start gap-4",
                    active 
                      ? "border-primary/50 bg-linear-to-r from-primary/5 to-transparent shadow-sm shadow-primary/5" 
                      : "border-border/60 bg-transparent"
                  )}
                >
                  {/* Active highlight bar on left */}
                  <div 
                    className={cn(
                      "w-1 h-12 rounded-full self-center transition-all duration-200",
                      active ? "bg-primary scale-100" : "bg-transparent scale-50"
                    )} 
                  />
                  
                  <div className="space-y-1">
                    <h4 className={cn(
                      "text-base font-bold tracking-tight transition-colors",
                      active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {feature.tabLabel}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.tabDesc}
                    </p>
                  </div>

                  <ChevronRight className={cn(
                    "size-5 ml-auto self-center transition-all",
                    active ? "text-primary translate-x-0" : "text-muted-foreground/40 group-hover:text-muted-foreground translate-x-[-4px]"
                  )} />
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  </section>
  );
}
