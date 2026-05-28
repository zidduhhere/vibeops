# Dashboard Today Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `components/vibeops/dashboard/today.tsx` to show a morning brief overlay on first load, sparkline stat cards, an AI activity feed with plain-language labels, and a priority queue grouped by urgency.

**Architecture:** All four sections live in a single file (`today.tsx`) as internal sub-components. No new files are created. Data is hardcoded mock constants at the top of the file — same shape real InsForge data would use. The morning brief dismissed-state is stored in `localStorage` with a date key so it reappears each new day.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, shadcn/ui (`Badge`, `Button`), Lucide icons, pure SVG sparklines (no chart library).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `components/vibeops/dashboard/today.tsx` | Full rewrite | All four sections: overlay, stats, activity feed, queue |

---

### Task 1: Data layer — types and mock constants

**Files:**
- Modify: `components/vibeops/dashboard/today.tsx` (top section, lines 1–120)

- [ ] **Step 1: Replace the top of `today.tsx` with the new types and constants**

Delete everything from line 1 to the start of `export function TodayView` and replace with:

```tsx
"use client";

import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowRight,
  CheckCircle2, Clock, Mail, MessageSquare, Send, X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
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
  Gmail:    { src: "/gmail.svg",               alt: "Gmail" },
  WhatsApp: { src: "/whatsapp-icon.svg",        alt: "WhatsApp" },
  Outlook:  { src: "/microsoft-outlook.svg",    alt: "Outlook" },
  Notion:   { src: "/notion.svg",               alt: "Notion" },
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
  decisions:  { label: "Decisions needed",       border: "border-l-red-500",  countLabel: (n) => `${n} decision${n !== 1 ? "s" : ""} needed` },
  ready:      { label: "Ready to send",           border: "border-l-amber-400", countLabel: (n) => `${n} ${n !== 1 ? "replies" : "reply"} ready to send` },
  "reach-out":{ label: "Reach out today",         border: "border-l-blue-500", countLabel: (n) => `${n} person${n !== 1 ? "s" : ""} to reach out` },
  "coming-up":{ label: "Coming up",               border: "border-l-border",   countLabel: (n) => `${n} coming up this week` },
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
  { id: "q1", client: "PeakFit Studio",  group: "decisions",  reason: "Scope creep detected — AI held the reply. Review before continuing." },
  { id: "q2", client: "Rafiq Stores",    group: "ready",      reason: "Discovery reply drafted and ready to send." },
  { id: "q3", client: "Aster Legal",     group: "ready",      reason: "Proposal follow-up drafted — proposal viewed twice." },
  { id: "q4", client: "Bloom Bakery",    group: "reach-out",  reason: "New lead — no reply sent yet. Proposal sent 3 days ago.", due: "Today" },
  { id: "q5", client: "Vertex Tech",     group: "coming-up",  reason: "Invoice #1042 unpaid — reminder due in 2 days.",            due: "Thu" },
  { id: "q6", client: "Sunrise Spa",     group: "coming-up",  reason: "Cold lead — last contact 5 days ago.",                      due: "Fri" },
];

// ── Sparkline data (7-day mock values) ───────────────────────────────────────

const sparkData = {
  handled:      [8, 10, 7, 12, 9, 11, 12],
  readyToSend:  [3, 5, 2, 6, 4, 3, 5],
  activeLeads:  [5, 6, 6, 7, 8, 8, 8],
  responseRate: [88, 90, 87, 92, 91, 93, 94],
  avgReplyMins: [180, 165, 200, 145, 138, 142, 138],
};
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit 2>&1 | grep today
```
Expected: no output (no errors in today.tsx).

- [ ] **Step 3: Commit**

```bash
git add components/vibeops/dashboard/today.tsx
git commit -m "refactor: replace today.tsx data layer with new types and plain-language constants"
```

---

### Task 2: Sparkline helper + stat cards

**Files:**
- Modify: `components/vibeops/dashboard/today.tsx` — add `Sparkline` component and `StatsRow` component after the constants block

- [ ] **Step 1: Add the `Sparkline` SVG component**

Add this after the constants block, before `TodayView`:

```tsx
// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ values, color = "stroke-primary" }: { values: number[]; color?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 56;
  const h = 24;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={points.join(" ")} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
    </svg>
  );
}
```

- [ ] **Step 2: Add the `StatsRow` component**

```tsx
// ── Stats row ─────────────────────────────────────────────────────────────────

interface Stat {
  label: string;
  value: string;
  data: number[];
  trend: "up" | "down" | "flat";
  trendGood: boolean; // true = green, false = red
  sparkColor: string;
}

const statsConfig: Stat[] = [
  { label: "Handled today",    value: "12", data: sparkData.handled,      trend: "up",   trendGood: true,  sparkColor: "stroke-emerald-500" },
  { label: "Ready to send",    value: "5",  data: sparkData.readyToSend,  trend: "up",   trendGood: false, sparkColor: "stroke-amber-400" },
  { label: "Active leads",     value: "8",  data: sparkData.activeLeads,  trend: "up",   trendGood: true,  sparkColor: "stroke-primary" },
  { label: "Response rate",    value: "94%",data: sparkData.responseRate, trend: "up",   trendGood: true,  sparkColor: "stroke-emerald-500" },
  { label: "Avg reply time",   value: "2h 18m", data: sparkData.avgReplyMins, trend: "down", trendGood: true, sparkColor: "stroke-emerald-500" },
];

function StatsRow() {
  return (
    <div className="grid grid-cols-5 gap-3">
      {statsConfig.map((s) => {
        const TrendIcon = s.trend === "up" ? ArrowUp : s.trend === "down" ? ArrowDown : null;
        const trendColor = s.trendGood ? "text-emerald-500" : "text-amber-500";
        return (
          <div key={s.label} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3.5 shadow-sm">
            <div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              {TrendIcon && (
                <div className={cn("mt-1 flex items-center gap-0.5 text-[10px] font-medium", trendColor)}>
                  <TrendIcon className="size-3" />
                  <span>{s.trend === "up" ? "+2 vs yesterday" : "−12m vs yesterday"}</span>
                </div>
              )}
            </div>
            <Sparkline values={s.data} color={s.sparkColor} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep today
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/vibeops/dashboard/today.tsx
git commit -m "feat: add sparkline component and stat cards to today view"
```

---

### Task 3: Morning Brief Overlay

**Files:**
- Modify: `components/vibeops/dashboard/today.tsx` — add `MorningBrief` component

- [ ] **Step 1: Add the `MorningBrief` component**

Add after `StatsRow`, before `TodayView`:

```tsx
// ── Morning Brief Overlay ─────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getBriefDismissedKey(): string {
  const d = new Date();
  return `vibeops_brief_dismissed_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function MorningBrief({
  firstName,
  onDismiss,
  onChipClick,
}: {
  firstName: string;
  onDismiss: () => void;
  onChipClick: (itemId: string) => void;
}) {
  const chips = [
    queueItems.find((q) => q.group === "decisions"),
    queueItems.find((q) => q.group === "ready"),
    queueItems.find((q) => q.group === "reach-out"),
  ].filter(Boolean) as QueueItem[];

  const decisionCount = queueItems.filter((q) => q.group === "decisions").length;
  const readyCount    = queueItems.filter((q) => q.group === "ready").length;
  const reachCount    = queueItems.filter((q) => q.group === "reach-out").length;

  const briefSentence = `The AI handled ${activities.filter((a) => a.status === "sent").length} conversations overnight.${decisionCount > 0 ? ` ${decisionCount === 1 ? "One thread needs" : `${decisionCount} threads need`} your decision.` : ""}${readyCount > 0 ? ` ${readyCount} ${readyCount === 1 ? "reply is" : "replies are"} ready to send.` : ""}${reachCount > 0 ? ` ${reachCount} ${reachCount === 1 ? "person needs" : "people need"} a follow-up today.` : ""}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[480px] rounded-2xl bg-white px-8 py-7 shadow-2xl text-black">
        {/* Close */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full text-black/40 hover:bg-black/5 transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Greeting */}
        <p className="text-xs font-medium uppercase tracking-widest text-black/40">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h2 className="mt-1.5 text-2xl font-bold text-black">
          {getGreeting()}, {firstName}.
        </h2>

        {/* Summary */}
        <p className="mt-3 text-sm leading-relaxed text-black/70">{briefSentence}</p>

        {/* Action chips */}
        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => { onDismiss(); onChipClick(chip.id); }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {chip.client}
                <span className="opacity-70">·</span>
                <span className="opacity-90">
                  {chip.group === "decisions" ? "Review now" : chip.group === "ready" ? "Send reply" : "Reach out"}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-black/40 hover:text-black/60 transition-colors"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80 transition-colors"
          >
            Get started
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep today
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/vibeops/dashboard/today.tsx
git commit -m "feat: add morning brief overlay with chips and localStorage dismiss"
```

---

### Task 4: AI Activity Feed component

**Files:**
- Modify: `components/vibeops/dashboard/today.tsx` — add `ActivityFeed` component

- [ ] **Step 1: Add the `ActivityFeed` component**

```tsx
// ── Activity Feed ─────────────────────────────────────────────────────────────

type ActivityFilter = "all" | ActivityStatus;

function ActivityFeed() {
  const [filter, setFilter]   = useState<ActivityFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filters: { key: ActivityFilter; label: string }[] = [
    { key: "all",        label: "All" },
    { key: "sent",       label: "Sent" },
    { key: "pending",    label: "Pending" },
    { key: "needs-call", label: "Needs call" },
  ];

  const visible = filter === "all" ? activities : activities.filter((a) => a.status === filter);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-semibold">AI Activity</p>
          <p className="text-xs text-muted-foreground">What the AI handled today</p>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {visible.map((a) => {
          const cfg  = statusConfig[a.status];
          const icon = channelIcon[a.channel];
          const isOpen = expanded === a.id;
          return (
            <div key={a.id}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : a.id)}
                className={cn("flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40", isOpen && "bg-muted/60")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", cfg.dot)} />
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  {icon
                    ? <img src={icon.src} alt={icon.alt} className="size-4" />
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

              {/* Expanded inline preview */}
              {isOpen && (
                <div className="border-t border-border bg-muted/30 px-5 py-4 space-y-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Client message</p>
                    <p className="text-xs leading-relaxed text-foreground rounded-xl bg-background border border-border px-3 py-2">{a.clientMessage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">AI draft</p>
                    <p className="text-xs leading-relaxed text-foreground rounded-xl bg-background border border-border px-3 py-2">{a.aiDraft}</p>
                  </div>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <button type="button" className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Send className="size-3" /> Approve &amp; Send
                      </button>
                      <button type="button" className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors">
                        Edit draft
                      </button>
                    </div>
                  )}
                  {a.status === "needs-call" && (
                    <div className="flex gap-2">
                      <button type="button" className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        Review &amp; Reply
                      </button>
                      <button type="button" className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                        Ignore
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep today
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/vibeops/dashboard/today.tsx
git commit -m "feat: add AI activity feed with filter tabs and inline expand"
```

---

### Task 5: Priority Queue component

**Files:**
- Modify: `components/vibeops/dashboard/today.tsx` — add `PriorityQueue` component

- [ ] **Step 1: Add the `PriorityQueue` component**

```tsx
// ── Priority Queue ────────────────────────────────────────────────────────────

const groupOrder: QueueGroup[] = ["decisions", "ready", "reach-out", "coming-up"];

function PriorityQueue({ highlightId }: { highlightId: string | null }) {
  const grouped = groupOrder.map((g) => ({
    group: g,
    items: queueItems.filter((q) => q.group === g),
    config: queueConfig[g],
  })).filter((g) => g.items.length > 0);

  const total = queueItems.length;

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-background p-6 text-muted-foreground shadow-sm">
        <CheckCircle2 className="size-8 opacity-30" />
        <p className="text-sm">Nothing needs attention — AI has it covered ✓</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="font-semibold">Your queue</p>
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{total}</span>
      </div>
      <div className="divide-y divide-border">
        {grouped.map(({ group, items, config }) => (
          <div key={group} className="px-5 py-3.5 space-y-2">
            {/* Group header */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {config.countLabel(items.length)}
            </p>
            {/* Items */}
            {items.map((item) => (
              <div key={item.id}
                id={`queue-${item.id}`}
                className={cn(
                  "rounded-xl border-l-4 bg-muted/40 px-3 py-3 transition-colors",
                  config.border,
                  highlightId === item.id && "ring-2 ring-primary ring-offset-1"
                )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.client}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
                    {item.due && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        <span>{item.due}</span>
                      </div>
                    )}
                  </div>
                  {group !== "coming-up" && (
                    <button type="button"
                      className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
                      {group === "decisions" ? "Review" : group === "ready" ? "Send" : "Draft reply"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep today
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/vibeops/dashboard/today.tsx
git commit -m "feat: add priority queue with plain-language groups and border indicators"
```

---

### Task 6: Wire everything into `TodayView`

**Files:**
- Modify: `components/vibeops/dashboard/today.tsx` — replace the `TodayView` export with the final assembled version

- [ ] **Step 1: Replace `TodayView` with the final wired version**

```tsx
// ── TodayView ─────────────────────────────────────────────────────────────────

export function TodayView({ userName, userPicture }: { userName?: string; userPicture?: string }) {
  const firstName = userName?.split(" ")[0] ?? "there";

  // Morning brief — show once per day
  const [showBrief, setShowBrief] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const key = getBriefDismissedKey();
    if (!localStorage.getItem(key)) {
      setShowBrief(true);
    }
  }, []);

  // Escape key closes brief
  useEffect(() => {
    if (!showBrief) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") dismissBrief(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showBrief]);

  function dismissBrief() {
    localStorage.setItem(getBriefDismissedKey(), "1");
    setShowBrief(false);
  }

  function handleChipClick(itemId: string) {
    setHighlightId(itemId);
    setTimeout(() => {
      document.getElementById(`queue-${itemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightId(null), 2500);
  }

  return (
    <>
      {/* Morning brief overlay */}
      {showBrief && (
        <MorningBrief
          firstName={firstName}
          onDismiss={dismissBrief}
          onChipClick={handleChipClick}
        />
      )}

      <div className="space-y-5">
        {/* Welcome */}
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-0.5 text-4xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        </div>

        {/* Stats row */}
        <StatsRow />

        {/* Two-zone content */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.65fr]">
          <ActivityFeed />
          <PriorityQueue highlightId={highlightId} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v PixelBlast
```
Expected: no output.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`. Verify:
- Morning brief overlay appears on first load (white card, primary chips, black text)
- Clicking a chip dismisses the overlay and scrolls + highlights the matching queue item
- Dismissing and refreshing: overlay does NOT reappear (same day)
- Stats row shows 5 cards with sparklines
- Activity feed filters work (All / Sent / Pending / Needs call)
- Expanding an activity row shows client message + AI draft + action buttons
- Queue shows 4 groups with colored left borders
- Empty state: clear queue items from `queueItems` array and verify "AI has it covered" message appears

- [ ] **Step 4: Commit**

```bash
git add components/vibeops/dashboard/today.tsx
git commit -m "feat: wire TodayView with morning brief overlay, stats, activity feed, and priority queue"
```
