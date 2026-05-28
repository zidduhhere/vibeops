"use client";

import { useEffect, useState } from "react";
import { Mail, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  handled:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  draft:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  flagged:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400",
};

const filters = ["All", "Unread", "Draft", "Flagged", "Handled"];

export function InboxView() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/inbox")
      .then((res) => res.json())
      .then((data) => {
        if (data.threads) {
          const mapped = data.threads.map((t: any) => ({
            id: t.id,
            client: t.client?.name || "Unknown",
            subject: t.latest_message?.subject || (t.latest_message?.body
              ? t.latest_message.body.substring(0, 30) + "..."
              : "New message"),
            preview: t.latest_message?.body || "No preview available",
            time: new Date(t.updated_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unread: t.status !== "archived" && t.status !== "handled",
            status: t.status === "archived" ? "handled" : t.status || "draft",
            channel: t.channel || "Unknown",
          }));
          setThreads(mapped);
        }
      })
      .catch((err) => console.error("Error fetching inbox", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = threads
    .filter((t) => {
      if (activeFilter === "Unread") return t.unread;
      if (activeFilter === "Draft") return t.status === "draft";
      if (activeFilter === "Flagged") return t.status === "flagged";
      if (activeFilter === "Handled") return t.status === "handled";
      return true;
    })
    .filter(
      (t) =>
        !query ||
        t.client.toLowerCase().includes(query.toLowerCase()) ||
        t.subject.toLowerCase().includes(query.toLowerCase()),
    );

  const selectedThread = threads.find((t) => t.id === selected);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All client messages across connected channels.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Thread list */}
        <div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm lg:w-[420px]">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="mt-3 flex gap-1 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    activeFilter === f
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id === selected ? null : t.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40",
                  selected === t.id && "bg-muted/60",
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {t.client[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        t.unread && "font-semibold",
                      )}
                    >
                      {t.client}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {t.time}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      t.unread
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {t.subject}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {t.preview}
                  </p>
                </div>
                {t.unread && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Thread detail */}
        <div className="flex flex-1 flex-col rounded-2xl border border-border bg-background shadow-sm">
          {selectedThread ? (
            <div className="flex flex-col h-full p-6 gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedThread.subject}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedThread.client} · {selectedThread.channel} ·{" "}
                    {selectedThread.time}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", statusColors[selectedThread.status])}
                >
                  {selectedThread.status === "handled"
                    ? "Handled"
                    : selectedThread.status === "draft"
                      ? "Draft ready"
                      : "Flagged"}
                </Badge>
              </div>
              <div className="rounded-xl bg-muted p-4 text-sm leading-relaxed">
                {selectedThread.preview}
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  AI Draft
                </p>
                <p className="text-sm leading-relaxed">
                  {selectedThread.status === "flagged"
                    ? "⚠️ AI held this reply — potential scope issue detected. Review before sending."
                    : "Yes, I can help with that. To give a useful estimate, can you share what business this is for, how many pages you need, whether content/photos are ready, and when you want to launch?"}
                </p>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Approve &amp; Send
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Edit Draft
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground p-8">
              <Mail className="size-8 opacity-30" />
              <p className="text-sm">Select a thread to view it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
