"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unused-vars */

import { Clock, CheckCircle2, ListTodo, Plus, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
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

const priorityConfig: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
};

const groups = ["Today", "Tomorrow", "This week", "Done"];

function FollowUpForm({ clientsList, onSuccess, onCancel }: { clientsList: any[], onSuccess: () => void, onCancel: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);

  const [formClientId, setFormClientId] = useState("");
  const [formClientName, setFormClientName] = useState("");
  const [formClientEmail, setFormClientEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formChannel, setFormChannel] = useState("email");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalClientId = formClientId;

      if (isNewClient) {
        const cRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formClientName,
            email: formClientEmail,
            channel: formChannel,
            syncContext: false
          })
        });
        if (cRes.ok) {
          const cData = await cRes.json();
          finalClientId = cData.id;
        } else {
          console.error("Failed to create client", await cRes.text());
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: finalClientId,
          reason: formNotes,
          due_date: formDueDate,
          channel: formChannel
        })
      });

      if (res.ok) {
        onSuccess();
      } else {
        console.error("Failed to add follow-up", await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleAddFollowup} className="space-y-4 pt-4">
      <div className="flex items-center gap-4 border-b pb-4">
        <button type="button" onClick={() => setIsNewClient(false)} className={cn("text-sm font-medium pb-1 transition-colors", !isNewClient ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>Existing Client</button>
        <button type="button" onClick={() => setIsNewClient(true)} className={cn("text-sm font-medium pb-1 transition-colors", isNewClient ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>New Client</button>
      </div>

      {!isNewClient ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Client</label>
          <select 
            required 
            value={formClientId}
            onChange={e => setFormClientId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="" disabled>Select a client...</option>
            {clientsList.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Name</label>
            <input required value={formClientName} onChange={e => setFormClientName(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="New Client Name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email (optional)</label>
            <input type="email" value={formClientEmail} onChange={e => setFormClientEmail(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" placeholder="client@example.com" />
          </div>
        </>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Due Date</label>
        <input type="date" required value={formDueDate} onChange={e => setFormDueDate(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Channel</label>
        <select value={formChannel} onChange={e => setFormChannel(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes for AI</label>
        <textarea required value={formNotes} onChange={e => setFormNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="E.g., Send them the new proposal..." />
      </div>

      <DialogFooter className="pt-2">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Save Follow-up
        </button>
      </DialogFooter>
    </form>
  );
}

export function FollowUpsView() {
  const [followups, setFollowups] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDelete, setSelectedDelete] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        fetch("/api/dashboard/followups"),
        fetch("/api/dashboard/clients")
      ]);
      const fData = await fRes.json();
      const cData = await cRes.json();
      
      if (cData.clients) {
        setClientsList(cData.clients);
      }

      if (fData.followups) {
        const mapped = fData.followups.map((f: any) => ({
          id: f.id,
          client: f.client?.name || "Unknown",
          type: "Follow-up",
          note: f.reason || "Check in with lead",
          due: f.grp === "reach-out" ? "Today" : "This week",
          priority: f.grp === "reach-out" ? "high" : "medium",
          done: f.resolved || false
        }));
        setFollowups(mapped);
        setDone(new Set(mapped.filter((f: any) => f.done).map((f: any) => f.id)));
      }
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/followups?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        setSelectedDelete(null);
        fetchData();
      } else {
        console.error("Failed to delete follow-up", await res.text());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleDone = async (id: string, currentlyDone: boolean) => {
    try {
      setDone(prev => {
        const next = new Set(prev);
        if (currentlyDone) next.delete(id);
        else next.add(id);
        return next;
      });

      await fetch("/api/dashboard/followups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: !currentlyDone })
      });
    } catch (err) {
      console.error(err);
      fetchData(); // revert
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Proactive outreach and pending actions.</p>
        </div>
        {!loading && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <Plus className="size-4" />
            New Follow-up
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : followups.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in zoom-in-95">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Clock className="size-10 text-primary" />
          </div>
          <h3 className="mt-4 text-xl font-bold">You're all caught up!</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            There are no pending follow-ups. The AI agent will automatically create reminders here if it detects a need.
          </p>
          <div className="mt-6">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:scale-105 active:scale-95">
              <Plus className="size-5" />
              Schedule Follow-up
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => {
            const isDoneGroup = group === "Done";
            const items = followups.filter(f => isDoneGroup ? done.has(f.id) : (f.due === group && !done.has(f.id)));
            
            return (
              <div key={group} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{group}</h3>
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{items.length}</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {items.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                      No items
                    </div>
                  )}
                  {items.map(item => {
                    const isDone = done.has(item.id);
                    return (
                      <div key={item.id} className={cn("group relative flex flex-col gap-3 rounded-md border bg-background p-4 transition-all hover:border-foreground/20", isDone && "opacity-60")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {item.client[0]}
                            </div>
                            <div>
                              <p className={cn("text-sm font-semibold", isDone && "line-through text-muted-foreground")}>{item.client}</p>
                              <p className="text-[10px] text-muted-foreground">Via email</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => { setSelectedDelete(item); setIsDeleteModalOpen(true); }} className="shrink-0 text-muted-foreground transition-colors hover:text-red-500">
                              <Trash2 className="size-4" />
                            </button>
                            <button type="button" onClick={() => handleToggleDone(item.id, isDone)} className={cn("shrink-0 text-muted-foreground transition-colors hover:text-foreground", isDone && "text-emerald-500 hover:text-emerald-600")}>
                              {isDone ? <CheckCircle2 className="size-5" /> : <div className="size-5 rounded-full border-2 border-muted-foreground/30" />}
                            </button>
                          </div>
                        </div>
                        <div className="rounded-md bg-muted/50 p-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0", priorityConfig[item.priority])}>{item.type}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Manual Follow-up</DialogTitle>
            <DialogDescription>
              Schedule a follow-up. The AI agent will track this and remind you when due.
            </DialogDescription>
          </DialogHeader>
          <FollowUpForm clientsList={clientsList} onSuccess={() => { setIsModalOpen(false); fetchData(); }} onCancel={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Follow-up</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this follow-up for {selectedDelete?.client}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted" disabled={isDeleting}>Cancel</button>
            <button type="button" onClick={() => selectedDelete && handleDelete(selectedDelete.id)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 flex items-center gap-2" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
