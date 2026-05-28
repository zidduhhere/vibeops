"use client";

import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowRight,
  CheckCircle2, Clock, Mail, MessageSquare, Send, X,
  Sparkles, Zap, TrendingUp, Bot,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type ActivityStatus = "sent" | "pending" | "needs-call";

type QueueGroup = "decisions" | "ready" | "reach-out" | "coming-up";

interface Activity {
  id: string;
  client: string;
  channel: string;
  status: ActivityStatus;
  summary: string;
  clientMessage: string;
  aiDraft: string;
  time: string;
}

interface QueueItem {
  id: string;
  client: string;
  group: QueueGroup;
  reason: string;
  due?: string;
}

// ── Channel icons ─────────────────────────────────────────────────────────────

const channelIcon: Record<string, { src: string; alt: string }> = {
  Gmail:    { src: "/gmail.svg",            alt: "Gmail" },
  WhatsApp: { src: "/whatsapp-icon.svg",     alt: "WhatsApp" },
  Outlook:  { src: "/microsoft-outlook.svg", alt: "Outlook" },
  Notion:   { src: "/notion.svg",            alt: "Notion" },
};

// ── Activity status config ────────────────────────────────────────────────────

const statusConfig: Record<ActivityStatus, { label: string; dot: string; badge: string }> = {
  sent: {
    label: "Sent",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  },
  pending: {
    label: "Pending approval",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  "needs-call": {
    label: "Needs your call",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
};

// ── Queue group config ────────────────────────────────────────────────────────

const queueConfig: Record<QueueGroup, { label: string; border: string; countLabel: (n: number) => string }> = {
  decisions:   { label: "Decisions needed",  border: "border-l-red-500",   countLabel: (n) => `${n} decision${n !== 1 ? "s" : ""} needed` },
  ready:       { label: "Ready to send",     border: "border-l-amber-400", countLabel: (n) => `${n} ${n !== 1 ? "replies" : "reply"} ready to send` },
  "reach-out": { label: "Reach out today",   border: "border-l-blue-500",  countLabel: (n) => `${n} person${n !== 1 ? "s" : ""} to reach out` },
  "coming-up": { label: "Coming up",         border: "border-l-border",    countLabel: (n) => `${n} coming up this week` },
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const activities: Activity[] = [
  {
    id: "1", client: "Rafiq Stores", channel: "Gmail", status: "pending",
    summary: "Drafted discovery reply to pricing inquiry",
    clientMessage: "Hi, I need an estimate for a web store for my retail shop. How much do you charge?",
    aiDraft: "Yes, I can help with that. To give a useful estimate, can you share what business this is for, how many pages you need, whether content/photos are ready, and when you want to launch?",
    time: "2m ago",
  },
  {
    id: "2", client: "Nila Wellness", channel: "Gmail", status: "sent",
    summary: "Sent weekly project status update",
    clientMessage: "Hey, checking in. Are we still on track for this week?",
    aiDraft: "Quick update: the homepage structure is done and I'm tightening the mobile layout today. The next visible milestone is the first review link, which I'll share tomorrow.",
    time: "18m ago",
  },
  {
    id: "3", client: "PeakFit Studio", channel: "WhatsApp", status: "needs-call",
    summary: "Scope creep detected — reply held for your review",
    clientMessage: "Can you also add automatic trainer assignment and SMS reminders? Should be small only no?",
    aiDraft: "That booking automation is useful, but it is outside the scope we agreed for this phase. I can either keep the current launch plan unchanged, or price this as a separate add-on after we finish the core site.",
    time: "1h ago",
  },
  {
    id: "4", client: "Aster Legal", channel: "Gmail", status: "pending",
    summary: "Follow-up draft ready — proposal viewed twice",
    clientMessage: "Thanks for sending this. We'll review and get back.",
    aiDraft: "Hi Ananya, just checking whether the website refresh proposal fits what you had in mind. Happy to walk through the scope in a quick 15-minute call this week.",
    time: "2h ago",
  },
  {
    id: "5", client: "Mooncart", channel: "WhatsApp", status: "sent",
    summary: "Sent end-of-week sprint summary",
    clientMessage: "Can we get a short end-of-week summary before the team call?",
    aiDraft: "This week: checkout spacing fixes complete, product card cleanup in review, only blocker is final copy for the new collection page.",
    time: "3h ago",
  },
];

const queueItems: QueueItem[] = [
  { id: "q1", client: "PeakFit Studio", group: "decisions",  reason: "Scope creep detected — AI held the reply. Review before continuing." },
  { id: "q2", client: "Rafiq Stores",   group: "ready",      reason: "Discovery reply drafted and ready to send." },
  { id: "q3", client: "Aster Legal",    group: "ready",      reason: "Proposal follow-up drafted — proposal viewed twice." },
  { id: "q4", client: "Bloom Bakery",   group: "reach-out",  reason: "New lead — no reply sent yet.", due: "Today" },
  { id: "q5", client: "Vertex Tech",    group: "coming-up",  reason: "Invoice #1042 unpaid — reminder due in 2 days.", due: "Thu" },
  { id: "q6", client: "Sunrise Spa",    group: "coming-up",  reason: "Cold lead — last contact 5 days ago.", due: "Fri" },
];

// ── Sparkline data (7-day mock values) ───────────────────────────────────────

const sparkData = {
  handled:      [8, 10, 7, 12, 9, 11, 12],
  readyToSend:  [3, 5, 2, 6, 4, 3, 5],
  activeLeads:  [5, 6, 6, 7, 8, 8, 8],
  responseRate: [88, 90, 87, 92, 91, 93, 94],
  avgReplyMins: [180, 165, 200, 145, 138, 142, 138],
};

export function TodayView({ userName, userPicture }: { userName?: string; userPicture?: string }) {
  const [activityList, setActivityList] = useState(activities);
  const [activityDetailsMap, setActivityDetailsMap] = useState(initialActivityDetails);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const firstName = userName?.split(" ")[0] ?? "there";

  const activeActivity = activityList.find((a) => a.id === selected);
  const activeDetail = activeActivity ? activityDetailsMap[activeActivity.id] : null;

  useEffect(() => {
    if (activeDetail) {
      setDraftText(activeDetail.generatedReply);
    } else {
      setDraftText("");
    }
  }, [selected, activeDetail]);

  const handleApprove = (id: string) => {
    setActivityList((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "handled" as ActivityStatus,
              summary: "Sent approved reply to client",
              preview: draftText,
            }
          : a
      )
    );
    setActivityDetailsMap((prev) => {
      const updated = { ...prev };
      if (updated[id]) {
        updated[id] = {
          ...updated[id],
          generatedReply: draftText,
          timeline: [
            { time: "Just now", event: "Approved draft sent to client" },
            ...updated[id].timeline,
          ],
        };
      }
      return updated;
    });
    setSelected(null);
  };

  const handleFlag = (id: string) => {
    setActivityList((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "flagged" as ActivityStatus,
              summary: "Scope creep detected — needs your review",
            }
          : a
      )
    );
    setActivityDetailsMap((prev) => {
      const updated = { ...prev };
      if (updated[id]) {
        updated[id] = {
          ...updated[id],
          timeline: [
            { time: "Just now", event: "Flagged manually by user" },
            ...updated[id].timeline,
          ],
        };
      }
      return updated;
    });
    setSelected(null);
  };

  const handleUndo = (id: string) => {
    setActivityList((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "draft" as ActivityStatus,
              summary: "Replied to pricing inquiry with discovery questions",
            }
          : a
      )
    );
    setActivityDetailsMap((prev) => {
      const updated = { ...prev };
      if (updated[id]) {
        updated[id] = {
          ...updated[id],
          timeline: [
            { time: "Just now", event: "Message recalled. Returned to draft status." },
            ...updated[id].timeline,
          ],
        };
      }
      return updated;
    });
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      {/* Welcome + stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-0.5 text-4xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        </div>
        <div className="flex items-center gap-8">
          {[
            { label: "Handled today", value: "12", color: "text-foreground" },
            { label: "Drafts ready", value: "5", color: "text-amber-500" },
            { label: "Flagged", value: "1", color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="text-right">
              <p className={cn("text-4xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI status bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-5 py-3.5 shadow-sm">
        <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-sm font-medium">AI is active</span>
        <span className="text-sm text-muted-foreground">— monitoring Gmail and WhatsApp, drafting replies, flagging edge cases.</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs"><Zap className="size-3 text-amber-500" />1 needs review</Badge>
          <Badge variant="outline" className="gap-1.5 text-xs"><TrendingUp className="size-3 text-emerald-500" />3 handled today</Badge>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Col 1 */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {userPicture ? (
                <img src={userPicture} alt={userName} className="size-16 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
              <p className="mt-3 font-semibold">{userName ?? "You"}</p>
              <p className="text-xs text-muted-foreground">Solo plan</p>
              <div className="mt-3 flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2">
                <span className="text-xs text-muted-foreground">AI replies sent</span>
                <span className="text-sm font-bold">47</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-sm font-semibold">Channels</p>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted">
                  <img src="/gmail.svg" alt="Gmail" className="size-4" />
                </div>
                <div className="flex-1"><p className="text-xs font-medium">Gmail</p><p className="text-[10px] text-emerald-600">Connected</p></div>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted">
                  <img src="/whatsapp-icon.svg" alt="WhatsApp" className="size-4" />
                </div>
                <div className="flex-1"><p className="text-xs font-medium">WhatsApp</p><p className="text-[10px] text-emerald-600">Connected</p></div>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              {[{ name: "Outlook", icon: "/microsoft-outlook.svg" }, { name: "Notion", icon: "/notion.svg" }].map((ch) => (
                <div key={ch.name} className="flex items-center gap-3 opacity-40">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted">
                    <img src={ch.icon} alt={ch.name} className="size-4" />
                  </div>
                  <div className="flex-1"><p className="text-xs font-medium">{ch.name}</p><p className="text-[10px] text-muted-foreground">Coming soon</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2+3 — Activity feed */}
        <div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div><p className="font-semibold">AI Activity</p><p className="text-xs text-muted-foreground">What the AI handled today</p></div>
            <div className="flex gap-1">
              {["All", "Draft", "Flagged"].map((f) => (
                <button key={f} type="button" className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{f}</button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {activityList.map((a) => {
              const cfg = statusConfig[a.status];
              return (
                <button key={a.id} type="button" onClick={() => setSelected(a.id)}
                  className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", cfg.dot)} />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    {channelIcon[a.channel]
                      ? <img src={channelIcon[a.channel].src} alt={channelIcon[a.channel].alt} className="size-4" />
                      : <Mail className="size-3.5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{a.client}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.summary}</p>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-[10px]", cfg.badge)}>{cfg.label}</Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Col 4 — Tasks */}
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Tasks</p>
            <span className="text-xs text-muted-foreground">{quickTasks.filter((t) => t.done).length}/{quickTasks.length}</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(quickTasks.filter((t) => t.done).length / quickTasks.length) * 100}%` }} />
          </div>
          <div className="mt-4 space-y-3">
            {quickTasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", task.done ? "border-emerald-500 bg-emerald-500" : "border-border bg-background")}>
                  {task.done && <CheckCircle2 className="size-3 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium", task.done && "line-through text-muted-foreground")}>{task.label}</p>
                  <p className="text-[10px] text-muted-foreground">{task.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Slide-over Panel */}
      {selected && activeActivity && activeDetail && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-45 transition-opacity duration-300 animate-in fade-in"
            onClick={() => setSelected(null)}
          />

          {/* Side Panel Container */}
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 animate-out slide-out-to-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {activeDetail.avatar}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{activeActivity.client}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {activeActivity.channel === "Gmail" ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <img src="/gmail.svg" alt="Gmail" className="size-3" />
                        <span>{activeDetail.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <img src="/whatsapp-icon.svg" alt="WhatsApp" className="size-3" />
                        <span>{activeDetail.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close panel"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Status Banner */}
              {activeActivity.status === "flagged" && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-800 dark:text-red-300">Scope Creep Warning</p>
                      <p className="text-xs text-red-700/90 dark:text-red-400/90 mt-1 leading-relaxed">
                        The client requested adding trainer assignment automation and SMS reminders, which are not defined in the agreed scope. AI has flagged this and paused the automated reply.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeActivity.status === "draft" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <Sparkles className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Review Draft Response</p>
                      <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1 leading-relaxed">
                        AI has prepared a drafted reply using your tone profile. You can review, edit, or approve this response.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeActivity.status === "handled" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Activity Complete</p>
                      <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90 mt-1 leading-relaxed">
                        This update was successfully processed and sent to the client. No action is required.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Thread */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversation Context</h4>
                
                {activeActivity.channel === "Gmail" && activeDetail.subject && (
                  <div className="rounded-lg bg-muted/40 border border-border/60 px-3.5 py-2 text-xs">
                    <span className="font-semibold text-muted-foreground mr-1.5">Subject:</span>
                    <span className="text-foreground">{activeDetail.subject}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Incoming Client Message */}
                  <div className="space-y-1 max-w-[85%]">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                      <span>{activeActivity.client}</span>
                      <span>•</span>
                      <span>Incoming</span>
                    </div>
                    <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-xs leading-relaxed text-foreground">
                      {activeDetail.lastClientMessage}
                    </div>
                  </div>

                  {/* AI Response Draft / Sent */}
                  <div className="space-y-1 max-w-[85%] ml-auto">
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground px-1">
                      <span>AI {activeActivity.status === "handled" ? "Sent" : "Draft"}</span>
                      <span>•</span>
                      <Sparkles className="size-3 text-primary animate-pulse" />
                    </div>
                    {activeActivity.status === "handled" ? (
                      <div className="rounded-2xl rounded-tr-none bg-primary text-primary-foreground px-4 py-3 text-xs leading-relaxed">
                        {activeDetail.generatedReply}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          className="w-full min-h-[120px] rounded-2xl rounded-tr-none border border-primary bg-background p-3.5 text-xs leading-relaxed text-foreground outline-none focus:ring-1 focus:ring-primary shadow-sm"
                          placeholder="Edit AI's draft reply..."
                        />
                        <p className="text-[10px] text-muted-foreground text-right px-1">
                          Draft is fully editable. Tone: Friendly & Professional.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Stats */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Details</h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                    <span className="text-[10px] text-muted-foreground block">Project Value</span>
                    <span className="text-sm font-semibold mt-1 block">{activeDetail.projectBudget}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                    <span className="text-[10px] text-muted-foreground block">Scope Status</span>
                    <span className={cn(
                      "text-sm font-semibold mt-1 block",
                      activeDetail.scopeStatus === "Creep Risk" ? "text-red-500" : "text-emerald-500"
                    )}>{activeDetail.scopeStatus}</span>
                  </div>
                </div>
              </div>

              {/* Timeline Logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activity Timeline</h4>
                <div className="relative border-l border-border/80 pl-4 ml-2 space-y-4">
                  {activeDetail.timeline.map((t, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[21px] top-1 flex size-2 items-center justify-center rounded-full bg-border ring-4 ring-background" />
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-foreground/90 leading-normal">{t.event}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{t.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-border p-4 bg-muted/10 shrink-0 flex items-center justify-end gap-3">
              {activeActivity.status === "handled" ? (
                <Button 
                  onClick={() => handleUndo(activeActivity.id)}
                  variant="outline"
                  size="sm"
                >
                  Recall Message
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => handleFlag(activeActivity.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Flag as Creep
                  </Button>
                  <Button
                    onClick={() => handleApprove(activeActivity.id)}
                    size="sm"
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
                  >
                    Approve & Send
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
