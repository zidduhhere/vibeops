"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const automations = [
  { id: "1", key: "auto_draft_pricing", name: "Auto-draft pricing replies", description: "When a Gmail thread contains pricing keywords, AI drafts a discovery-first reply for your review.", category: "Leads", runs: 12 },
  { id: "2", key: "scope_creep_detector", name: "Scope creep detector", description: "Flags any client message requesting work outside the original proposal scope before replying.", category: "Clients", runs: 3 },
  { id: "3", key: "proposal_followup", name: "Proposal follow-up reminder", description: "If a proposal hasn't received a reply in 3 days, remind you and offer a draft nudge.", category: "Leads", runs: 5 },
  { id: "4", key: "weekly_status", name: "Weekly project status", description: "Every Friday, draft a status update for each active client based on Notion task notes.", category: "Clients", runs: 0 },
  { id: "5", key: "invoice_reminder", name: "Invoice reminder", description: "7 days after an invoice is sent with no payment, draft a polite reminder email.", category: "Finance", runs: 0 },
  { id: "6", key: "lead_qualification", name: "New lead qualification", description: "Analyse first messages from new contacts and score them on intent, budget signals, and scope clarity.", category: "Leads", runs: 8 },
];

const categories = ["All", "Leads", "Clients", "Finance"];

export function AutomationsView() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/automations")
      .then(res => res.json())
      .then(data => {
        if (data.automations) {
          const active = new Set<string>();
          data.automations.forEach((a: any) => {
            if (a.enabled) active.add(a.automation_key);
          });
          // Default ones that should be on if no record exists? Let's just use what's in DB.
          setActiveKeys(active);
        }
      })
      .catch(err => console.error("Error fetching automations", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleAutomation = async (key: string, current: boolean) => {
    const nextState = !current;
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (nextState) next.add(key);
      else next.delete(key);
      return next;
    });

    try {
      await fetch("/api/dashboard/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: key, enabled: nextState })
      });
    } catch (err) {
      console.error("Failed to toggle automation", err);
      // Revert on error
      setActiveKeys(prev => {
        const next = new Set(prev);
        if (current) next.add(key);
        else next.delete(key);
        return next;
      });
    }
  };

  const filtered = automations.filter((a) => filter === "All" || a.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI rules running in the background on your behalf.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-sm font-medium">{activeKeys.size} active</span>
        </div>
      </div>

      <div className="flex gap-1">
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setFilter(c)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", filter === c ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted border border-border bg-background")}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((automation) => {
          const isActive = activeKeys.has(automation.key);
          return (
            <div key={automation.id} className={cn("rounded-2xl border border-border bg-background p-5 shadow-sm transition-opacity", !isActive && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="size-4 text-primary" />
                </div>
                {/* Toggle */}
                <button type="button" onClick={() => toggleAutomation(automation.key, isActive)}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none", isActive ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform", isActive ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
              <div className="mt-3">
                <p className="font-medium text-sm">{automation.name}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{automation.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{automation.category}</span>
                {isActive && <span className="text-[10px] text-muted-foreground">{automation.runs} runs this week</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
