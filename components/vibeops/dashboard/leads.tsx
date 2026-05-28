"use client";

import { useState, useEffect } from "react";
import { TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stages = ["All", "Discovery", "Proposal sent", "Proposal viewed", "Follow-up due", "Cold"];

const scoreColor = (s: number) => s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-500" : "text-red-500";
const scoreBg = (s: number) => s >= 75 ? "bg-emerald-500" : s >= 50 ? "bg-amber-400" : "bg-red-400";

export function LeadsView() {
  const [activeStage, setActiveStage] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/leads")
      .then(res => res.json())
      .then(data => {
        if (data.leads) {
          const mapped = data.leads.map((l: any) => ({
            id: l.id,
            name: l.name,
            service: l.bio || "Unknown service",
            budget: "Unknown",
            score: Math.floor(Math.random() * 50) + 50, // mock score for now since it's not in db
            stage: "Discovery", // mock stage for now
            lastContact: "Recently",
            channel: "Email",
            trend: "up"
          }));
          setLeads(mapped);
        }
      })
      .catch(err => console.error("Error fetching leads", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) => activeStage === "All" || l.stage === activeStage);
  const selectedLead = leads.find((l) => l.id === selected);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track and prioritise your active leads.</p>
      </div>

      {/* Stage filters */}
      <div className="flex gap-1 flex-wrap">
        {stages.map((s) => (
          <button key={s} type="button" onClick={() => setActiveStage(s)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", activeStage === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted border border-border bg-background")}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Lead list */}
        <div className="flex flex-col gap-3 lg:w-[400px]">
          {filtered.map((lead) => (
            <button key={lead.id} type="button" onClick={() => setSelected(lead.id === selected ? null : lead.id)}
              className={cn("rounded-2xl border border-border bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted/40", selected === lead.id && "ring-2 ring-primary")}>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {lead.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{lead.name}</p>
                    <span className={cn("text-lg font-bold tabular-nums", scoreColor(lead.score))}>{lead.score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.service}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", scoreBg(lead.score))} style={{ width: `${lead.score}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] px-2 py-0">{lead.stage}</Badge>
                    <span className="text-[10px] text-muted-foreground">{lead.lastContact}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Lead detail */}
        <div className="flex-1 rounded-2xl border border-border bg-background p-6 shadow-sm">
          {selectedLead ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">{selectedLead.name[0]}</div>
                <div>
                  <h2 className="text-xl font-bold">{selectedLead.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedLead.service} · {selectedLead.channel}</p>
                </div>
                <span className={cn("ml-auto text-4xl font-bold tabular-nums", scoreColor(selectedLead.score))}>{selectedLead.score}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Stage", selectedLead.stage],
                  ["Budget", selectedLead.budget],
                  ["Last contact", selectedLead.lastContact],
                  ["Channel", selectedLead.channel],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">AI Recommendation</p>
                <p className="text-sm leading-relaxed">
                  {selectedLead.score >= 75 ? "High intent signal. Ask 4 scoping questions before quoting. Avoid mentioning price until business type, pages, content readiness, and launch date are confirmed." : selectedLead.score >= 50 ? "Medium interest. Send a low-pressure follow-up with a specific next step — a 15-minute call or a simple question." : "Cold lead. Don't over-invest. A single check-in message is enough. If no reply in 7 days, archive."}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Draft Reply</button>
                <button type="button" className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">View Thread</button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <User className="size-8 opacity-30" />
              <p className="text-sm">Select a lead to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
