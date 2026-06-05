"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useState, useEffect } from "react";
import { BriefcaseBusiness, UserPlus, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const healthConfig: Record<string, string> = {
  Healthy: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  Stable: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
  "At risk": "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
};

function ClientForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formChannel, setFormChannel] = useState("email");
  const [syncContext, setSyncContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          channel: formChannel,
          syncContext: formChannel === "email" ? syncContext : false
        })
      });
      if (res.ok) {
        onSuccess();
      } else {
        console.error("Failed to add client", await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleAddClient} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <input 
          required 
          value={formName}
          onChange={e => setFormName(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
          placeholder="Client Name" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email Address</label>
        <input 
          type="email" 
          required 
          value={formEmail}
          onChange={e => setFormEmail(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
          placeholder="client@example.com" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Tracking Channel</label>
        <select 
          value={formChannel}
          onChange={e => setFormChannel(e.target.value)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      
      {formChannel === "email" && (
        <div className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/30">
          <input 
            type="checkbox" 
            id="sync" 
            checked={syncContext}
            onChange={(e) => setSyncContext(e.target.checked)}
            className="mt-1"
          />
          <div className="space-y-1 leading-none">
            <label htmlFor="sync" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
              <Sparkles className="size-3.5 text-primary" />
              Agentic Context Sync
            </label>
            <p className="text-[11px] text-muted-foreground mt-1">
              The AI will automatically pull in recent past emails with this address to build deep context.
            </p>
          </div>
        </div>
      )}

      <DialogFooter className="pt-2">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Save Client
        </button>
      </DialogFooter>
    </form>
  );
}

export function ClientsView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClients = () => {
    setLoading(true);
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
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected(null);
        setIsDeleteModalOpen(false);
        fetchClients();
      } else {
        console.error("Failed to delete client", await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selected);


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Active projects and retainer clients.</p>
        </div>
        {!loading && clients.length > 0 && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <UserPlus className="size-4" />
            Add Client
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in zoom-in-95">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <BriefcaseBusiness className="size-10 text-primary" />
          </div>
          <h3 className="mt-4 text-xl font-bold">No clients found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            You don't have any active clients yet. Add one manually so the AI agent can start tracking their communications and context.
          </p>
          <div className="mt-6">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:scale-105 active:scale-95">
              <UserPlus className="size-5" />
              Add Your First Client
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="grid gap-3 lg:w-[400px]">
            {clients.map((client) => (
              <button key={client.id} type="button" onClick={() => setSelected(client.id === selected ? null : client.id)}
                className={cn("rounded-md border bg-background p-4 text-left transition-all hover:bg-muted/50", selected === client.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/20")}>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">{client.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{client.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.service}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase">Health</span>
                    <Badge variant="outline" className={cn("mt-0.5 w-fit text-[10px] px-1.5 py-0", healthConfig[client.health])}>{client.health}</Badge>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase">Last update</span>
                    <span className="text-[10px] font-medium mt-1">{client.lastMessage}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 rounded-md border border-border bg-background p-6">
            {selectedClient ? (
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-14 items-center justify-center rounded-md bg-primary/10 text-2xl font-bold text-primary">{selectedClient.name[0]}</div>
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
                    <div key={label} className="rounded-md bg-muted/50 border border-border/50 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p className="mt-1 text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">AI Note</p>
                  <p className="text-sm leading-relaxed">
                    {selectedClient.health === "At risk" ? "Scope boundary needed. Client requested features outside agreed scope — AI has held the reply. Review and respond before work continues." : selectedClient.health === "Healthy" ? "Client is responsive and progress is on track. Next update due before end of week." : "Retainer client with stable cadence. No flags this week."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="flex-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Send Update</button>
                  <button type="button" className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">View Thread</button>
                  <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="rounded-md border border-red-200 text-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors">Delete</button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Client</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete {selectedClient.name}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted" disabled={isDeleting}>Cancel</button>
                        <button type="button" onClick={() => handleDelete(selectedClient.id)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 flex items-center gap-2" disabled={isDeleting}>
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
                <BriefcaseBusiness className="size-8 opacity-30" />
                <p className="text-sm">Select a client to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline Dialog to prevent unmounting on typing */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Manually track a new client. The AI agent will begin monitoring this channel.
            </DialogDescription>
          </DialogHeader>
          <ClientForm 
            onSuccess={() => { setIsModalOpen(false); fetchClients(); }} 
            onCancel={() => setIsModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
