"use client";

import { Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityConfig: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
};

const groups = ["Today", "Tomorrow", "This week", "Done"];

export function FollowUpsView() {
  const [followups, setFollowups] = useState<any[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/followups")
      .then(res => res.json())
      .then(data => {
        if (data.followups) {
          const mapped = data.followups.map((f: any) => ({
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
      })
      .catch(err => console.error("Error fetching followups", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nudges, check-ins, and reminders — prioritised by urgency.</p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => {
          const items = followups.filter((f) => f.due === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group}</p>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{items.filter((i) => !done.has(i.id)).length} remaining</span>
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const isDone = done.has(item.id);
                  return (
                    <div key={item.id} className={cn("flex items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm transition-opacity", isDone && "opacity-50")}>
                      <button type="button" onClick={() => setDone((prev) => { const next = new Set(prev); isDone ? next.delete(item.id) : next.add(item.id); return next; })}
                        className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors", isDone ? "border-emerald-500 bg-emerald-500" : "border-border hover:border-primary")}>
                        {isDone && <CheckCircle2 className="size-3.5 text-white" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>{item.client}</p>
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0", priorityConfig[item.priority])}>{item.type}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
                      </div>
                      {!isDone && (
                        <button type="button" className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">Draft</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
