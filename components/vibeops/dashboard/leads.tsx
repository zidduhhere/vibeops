"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useState, useEffect } from "react";
import { TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const stages = ["All", "Discovery", "Proposal sent", "Proposal viewed", "Follow-up due", "Cold"];

export function LeadsView() {
  const [activeStage, setActiveStage] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeads = () => {
    setLoading(true);
    fetch("/api/dashboard/leads")
      .then(res => res.json())
      .then(data => {
        if (data.leads) {
          const mapped = data.leads.map((l: any) => ({
            id: l.id,
            name: l.name,
            service: l.bio || "Unknown service",
            budget: l.metadata?.budget || "Unknown",
            location: l.metadata?.location || "Unknown",
            channel: l.metadata?.communication_means || "Email",
            score: (l.name.charCodeAt(0) * 7) % 100, // internal stable mock score
            stage: "Discovery", // mock stage for now
            lastContact: "Recently",
            trend: "up"
          }));
          setLeads(mapped);
        }
      })
      .catch(err => console.error("Error fetching leads", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected(null);
        setIsDeleteModalOpen(false);
        fetchLeads();
      } else {
        console.error("Failed to delete lead", await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

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
              className={cn("rounded-md border bg-background p-4 text-left transition-all hover:bg-muted/50", selected === lead.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/20")}>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                  {lead.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{lead.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.service}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 rounded-sm">{lead.stage}</Badge>
                    <span className="text-[10px] text-muted-foreground">{lead.lastContact}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Lead detail */}
        <div className="flex-1 rounded-md border border-border bg-background p-6">
          {selectedLead ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-md bg-primary/10 text-2xl font-bold text-primary">{selectedLead.name[0]}</div>
                <div>
                  <h2 className="text-xl font-bold">{selectedLead.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedLead.service} · {selectedLead.channel}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Stage", selectedLead.stage],
                  ["Budget", selectedLead.budget],
                  ["Location", selectedLead.location],
                  ["Channel", selectedLead.channel],
                  ["Last contact", selectedLead.lastContact],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-muted/50 border border-border/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">AI Recommendation</p>
                <p className="text-sm leading-relaxed">
                  {selectedLead.score >= 75 ? "High intent signal. Ask 4 scoping questions before quoting. Avoid mentioning price until business type, pages, content readiness, and launch date are confirmed." : selectedLead.score >= 50 ? "Medium interest. Send a low-pressure follow-up with a specific next step — a 15-minute call or a simple question." : "Cold lead. Don't over-invest. A single check-in message is enough. If no reply in 7 days, archive."}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="flex-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Draft Reply</button>
                <button type="button" className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">View Thread</button>
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="rounded-md border border-red-200 text-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors">Delete</button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Lead</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete {selectedLead.name}? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted" disabled={isDeleting}>Cancel</button>
                      <button type="button" onClick={() => handleDelete(selectedLead.id)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 flex items-center gap-2" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                        Delete
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
