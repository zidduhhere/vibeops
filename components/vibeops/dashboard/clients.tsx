"use client";

import { useState, useEffect } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const healthConfig: Record<string, string> = {
  Healthy: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  Stable: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
  "At risk": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
};

export function ClientsView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/clients")
      .then(res => res.json())
      .then(data => {
        if (data.clients) {
          const mapped = data.clients.map((c: any) => ({
            id: c.id,
            name: c.name,
            service: c.bio || "Active project",
            health: "Healthy",
            status: "Active",
            daysLeft: Math.floor(Math.random() * 30),
            budget: "Approved",
            lastMessage: "Recently",
            risk: "Low"
          }));
          setClients(mapped);
        }
      })
      .catch(err => console.error("Error fetching clients", err))
      .finally(() => setLoading(false));
  }, []);

  const selectedClient = clients.find((c) => c.id === selected);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="mt-1 text-sm text-muted-foreground">Active projects and retainer clients.</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="grid gap-3 lg:w-[400px]">
          {clients.map((client) => (
            <button key={client.id} type="button" onClick={() => setSelected(client.id === selected ? null : client.id)}
              className={cn("rounded-2xl border border-border bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted/40", selected === client.id && "ring-2 ring-primary")}>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{client.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{client.name}</p>
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0", healthConfig[client.health])}>{client.health}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{client.service}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{client.status}</span>
                    {client.daysLeft && <span className="text-[10px] text-muted-foreground">· {client.daysLeft}d to launch</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">{client.lastMessage}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-2xl border border-border bg-background p-6 shadow-sm">
          {selectedClient ? (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">{selectedClient.name[0]}</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedClient.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedClient.service}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs", healthConfig[selectedClient.health])}>{selectedClient.health}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Status", selectedClient.status],
                  ["Budget", selectedClient.budget],
                  ["Risk level", selectedClient.risk],
                  ["Last message", selectedClient.lastMessage],
                  ...(selectedClient.daysLeft ? [["Days to launch", `${selectedClient.daysLeft} days`]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">AI Note</p>
                <p className="text-sm leading-relaxed">
                  {selectedClient.health === "At risk" ? "Scope boundary needed. Client requested features outside agreed scope — AI has held the reply. Review and respond before work continues." : selectedClient.health === "Healthy" ? "Client is responsive and progress is on track. Next update due before end of week." : "Retainer client with stable cadence. No flags this week."}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Send Update</button>
                <button type="button" className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">View Thread</button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <BriefcaseBusiness className="size-8 opacity-30" />
              <p className="text-sm">Select a client to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
