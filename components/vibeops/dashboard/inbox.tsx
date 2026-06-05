"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Search, Loader2, RefreshCw, CheckCheck } from "lucide-react";
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
  ignored:
    "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400",
};

const filters = ["All", "Unread", "Draft", "Flagged", "Handled", "WhatsApp", "Ignored"];

function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  if (channel === "whatsapp") {
    return (
      <span className={cn("flex items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]", className)}>
        <MessageCircle className="size-3" />
      </span>
    );
  }
  return (
    <span className={cn("flex items-center justify-center rounded-full bg-primary/10 text-primary", className)}>
      <Mail className="size-3" />
    </span>
  );
}

export function InboxView() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const togglePriority = async (thread: any) => {
    if (!thread.clientId || toggling) return;
    setToggling(true);
    const newTaggedState = !thread.isTagged;
    try {
      const res = await fetch("/api/clients/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: thread.clientId, tagged: newTaggedState })
      });
      if (res.ok) {
        setThreads(prev => prev.map(t => t.clientId === thread.clientId ? { ...t, isTagged: newTaggedState } : t));
      }
    } catch (e) {
      console.error("Failed to toggle priority", e);
    } finally {
      setToggling(false);
    }
  };

  const fetchInbox = async () => {
    try {
      const res = await fetch("/api/dashboard/inbox");
      const data = await res.json();
      if (data.threads) {
        const mapped = data.threads.map((t: any) => ({
          id: t.id,
          clientId: t.client?.id,
          client: t.client?.name || "Unknown",
          isTagged: t.client?.tags?.includes("tagged") || false,
          subject: t.latest_message?.subject || (t.latest_message?.body
            ? t.latest_message.body.substring(0, 30) + "..."
            : "New message"),
          preview: t.latest_message?.body || "No preview available",
          time: new Date(t.updated_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unread: t.latest_message ? !t.latest_message.is_read : (t.status !== "archived" && t.status !== "handled"),
          latest_message_id: t.latest_message?.id || null,
          status: 
            t.status === "archived" || t.status === "sent" ? "handled" : 
            t.status === "needs-call" ? "flagged" : 
            t.status === "ignored" ? "ignored" : "draft",
          channel: t.channel || "Unknown",
          ai_draft: t.ai_draft || null,
        }));
        setThreads(mapped);
      }
    } catch (err) {
      console.error("Error fetching inbox", err);
    }
  };

  const generateDraft = async (id: string, subject: string, body: string, tone?: string) => {
    setGeneratingDraft(true);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, tone, conversationId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.draft) {
          setDrafts(prev => ({ ...prev, [id]: data.draft }));
        }
      }
    } catch (e) {
      console.error("Failed to generate draft", e);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSelectThread = async (id: string | null) => {
    setSelected(id === selected ? null : id);
    if (!id || generatingDraft) return;

    const thread = threads.find(t => t.id === id);
    if (!thread) return;

    // Mark as read locally and in backend if unread
    if (thread.unread) {
      setThreads(prev => prev.map(t => t.id === id ? { ...t, unread: false } : t));
      if (thread.latest_message_id) {
        fetch("/api/dashboard/inbox/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: thread.latest_message_id })
        }).catch(e => console.error("Failed to mark as read", e));
      }
    }

    if (drafts[id]) return;

    if (thread.ai_draft) {
      setDrafts(prev => ({ ...prev, [id]: thread.ai_draft }));
    } else {
      generateDraft(id, thread.subject, thread.preview);
    }
  };

  useEffect(() => {
    // 1. Initial quick load from local DB
    fetchInbox().finally(() => setLoading(false));

    // 2. Trigger background sync
    setSyncing(true);
    fetch("/api/integrations/gmail/sync", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.processedCount && data.processedCount > 0) {
          // If new messages were processed, refresh the UI
          fetchInbox();
        }
      })
      .catch((err) => console.error("Sync failed", err))
      .finally(() => setSyncing(false));
  }, []);

  const filtered = threads
    .filter((t) => {
      if (activeFilter === "Unread")   return t.unread && t.status !== "ignored";
      if (activeFilter === "Draft")    return t.status === "draft";
      if (activeFilter === "Flagged")  return t.status === "flagged";
      if (activeFilter === "Handled")  return t.status === "handled";
      if (activeFilter === "WhatsApp") return t.channel === "whatsapp";
      if (activeFilter === "Ignored")  return t.status === "ignored";
      
      // "All" filter - show everything EXCEPT ignored (unless explicitly on the Ignored tab)
      return t.status !== "ignored";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            Inbox
            {syncing && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            All client messages across connected channels.
            {syncing && <span className="text-primary text-xs">Syncing new messages...</span>}
          </p>
        </div>
        <button 
          onClick={() => {
            setSyncing(true);
            fetch("/api/integrations/gmail/sync", { method: "POST" })
              .then(() => fetchInbox())
              .finally(() => setSyncing(false));
          }}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
          Sync Now
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Thread list */}
        <div className="flex flex-col rounded-md border border-border bg-background lg:w-[420px]">
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
          <div className="divide-y divide-border relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin mb-4" />
                <p className="text-sm">Loading your messages...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="size-8 opacity-30 mb-4" />
                <p className="text-sm">No messages found.</p>
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectThread(t.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40",
                    selected === t.id && "bg-muted/60",
                  )}
                >
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {t.client[0]}
                    {/* Channel badge */}
                    <ChannelIcon
                      channel={t.channel}
                      className="absolute -bottom-0.5 -right-0.5 size-4 border border-background"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium flex items-center gap-1",
                          t.unread && "font-semibold",
                        )}
                      >
                        {t.client}
                        {t.isTagged && <span className="text-xs">⭐</span>}
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
              ))
            )}
          </div>
        </div>

        {/* Thread detail */}
        <div className="flex flex-1 flex-col rounded-md border border-border bg-background">
          {selectedThread ? (
            <div className="flex flex-col h-full p-6 gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {selectedThread.subject}
                    {selectedThread.isTagged && <span className="text-xl" title="Priority Client">⭐</span>}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    {selectedThread.channel === "whatsapp" ? (
                      <MessageCircle className="size-3.5 text-[#25D366]" />
                    ) : (
                      <Mail className="size-3.5" />
                    )}
                    {selectedThread.client} · {selectedThread.channel === "whatsapp" ? "WhatsApp" : selectedThread.channel} · {selectedThread.time}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusColors[selectedThread.status] || statusColors.draft)}
                  >
                    {selectedThread.status === "handled"
                      ? "Handled"
                      : selectedThread.status === "ignored"
                        ? "Ignored"
                        : selectedThread.status === "draft"
                          ? "Draft ready"
                          : "Flagged"}
                  </Badge>
                  <button 
                    onClick={() => togglePriority(selectedThread)}
                    disabled={toggling}
                    className="text-xs border rounded-md px-2 py-1 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {selectedThread.isTagged ? "Remove Priority" : "⭐ Mark Priority"}
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-muted p-4 text-sm leading-relaxed">
                {selectedThread.preview}
              </div>
              {/* Draft Section */}
              {/* Magic Draft Section */}
              <div className="flex flex-col rounded-md border border-border bg-background overflow-hidden mt-4 transition-all">
                <div className="bg-gradient-to-r from-primary/10 to-transparent px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary animate-pulse">✨</span>
                    <p className="text-sm font-medium text-foreground tracking-wide">
                      Help me write
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1">Tone:</span>
                    {["Professional", "Friendly", "Direct", "Urgent"].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => generateDraft(selectedThread.id, selectedThread.subject, selectedThread.preview, tone)}
                        disabled={generatingDraft}
                        className="text-xs px-2.5 py-1 rounded-full border border-primary/20 bg-background hover:bg-primary/5 hover:border-primary/50 text-foreground transition-all disabled:opacity-50"
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex border-b border-border pb-3 text-sm items-center">
                    <span className="text-muted-foreground w-12 text-xs uppercase tracking-wider font-semibold">To</span>
                    <span className="font-medium bg-muted px-2 py-0.5 rounded-md">{selectedThread.client}</span>
                  </div>
                  
                  {generatingDraft ? (
                    <div className="space-y-3 py-4">
                      <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded-md animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded-md animate-pulse w-full"></div>
                      <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded-md animate-pulse w-5/6"></div>
                      <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded-md animate-pulse w-1/2"></div>
                    </div>
                  ) : selectedThread.status === "flagged" && !drafts[selectedThread.id] ? (
                    <div className="p-4 my-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-sm text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 shadow-sm">
                      <p className="font-semibold mb-1 flex items-center gap-1.5">⚠️ Human Review Required</p>
                      AI has held this reply due to potential scope changes or ambiguity. Please manually draft a response or select a tone above to force generation.
                    </div>
                  ) : (
                    <textarea 
                      className="w-full min-h-[160px] text-sm resize-y outline-none bg-transparent placeholder:text-muted-foreground/50 pt-2 leading-relaxed"
                      value={drafts[selectedThread.id] || ""}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [selectedThread.id]: e.target.value }))}
                      placeholder="Start typing your response, or use the magic tools above to generate a draft..."
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  type="button"
                  disabled={sending || sendSuccess || !drafts[selectedThread.id]}
                  onClick={async () => {
                    if (!selectedThread) return;
                    const draftText = drafts[selectedThread.id];
                    if (selectedThread.channel === "whatsapp") {
                      setSending(true);
                      setSendSuccess(false);
                      try {
                        const res = await fetch("/api/integrations/whatsapp/send", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            to: selectedThread.client, // phone number stored as client identifier
                            text: draftText || "Thank you for your message!",
                          }),
                        });
                        if (res.ok) {
                          setSendSuccess(true);
                          setTimeout(() => setSendSuccess(false), 3000);
                        } else {
                          const err = await res.json();
                          alert(err.error ?? "Failed to send message");
                        }
                      } catch (e) {
                        console.error(e);
                        alert("Network error sending message");
                      } finally {
                        setSending(false);
                      }
                    } else {
                      // Gmail — existing behaviour placeholder
                      alert("Send via Gmail — coming soon");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {sending ? (
                    <><Loader2 className="size-4 animate-spin" /> Sending&hellip;</>
                  ) : sendSuccess ? (
                    <><CheckCheck className="size-4" /> Sent!</>
                  ) : (
                    "Send Reply"
                  )}
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
