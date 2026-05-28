"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Send,
  X,
  Sparkles,
  Zap,
  TrendingUp,
  Bot,
  Tag,
  ChevronRight,
  User,
  Briefcase,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type ActivityStatus = "sent" | "pending" | "needs-call";
type QueueGroup = "decisions" | "ready" | "reach-out" | "coming-up";

interface ThreadMessage {
  id: string;
  from_party: "client" | "you";
  body: string;
  sent_at: string;
}

interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  tags: string[];
}

interface Activity {
  id: string;
  channel: string;
  status: ActivityStatus;
  summary: string;
  client_message: string | null;
  ai_draft: string | null;
  acted_at: string;
  conversation_id: string | null;
  client: ClientRecord | null;
}

interface QueueItem {
  id: string;
  grp: QueueGroup;
  reason: string;
  due_date: string | null;
  client: ClientRecord | null;
  activity_id: string | null;
}

interface DailyStat {
  stat_date: string;
  handled: number;
  ready_to_send: number;
  active_leads: number;
  response_rate: number;
  avg_reply_mins: number;
}

// ── Channel icons ─────────────────────────────────────────────────────────────

const channelIcon: Record<string, { src: string; alt: string }> = {
  Gmail: { src: "/gmail.svg", alt: "Gmail" },
  WhatsApp: { src: "/whatsapp-icon.svg", alt: "WhatsApp" },
  Outlook: { src: "/microsoft-outlook.svg", alt: "Outlook" },
  Notion: { src: "/notion.svg", alt: "Notion" },
};

// ── Activity status config ────────────────────────────────────────────────────

const statusConfig: Record<
  ActivityStatus,
  { label: string; dot: string; badge: string }
> = {
  sent: {
    label: "Sent",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  },
  pending: {
    label: "Pending approval",
    dot: "bg-amber-400",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  "needs-call": {
    label: "Needs your call",
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
};

// ── Queue group config ────────────────────────────────────────────────────────

const queueConfig: Record<
  QueueGroup,
  { label: string; border: string; countLabel: (n: number) => string }
> = {
  decisions: {
    label: "Decisions needed",
    border: "border-l-red-500",
    countLabel: (n) => `${n} decision${n !== 1 ? "s" : ""} needed`,
  },
  ready: {
    label: "Ready to send",
    border: "border-l-amber-400",
    countLabel: (n) => `${n} ${n !== 1 ? "replies" : "reply"} ready to send`,
  },
  "reach-out": {
    label: "Reach out today",
    border: "border-l-blue-500",
    countLabel: (n) => `${n} person${n !== 1 ? "s" : ""} to reach out`,
  },
  "coming-up": {
    label: "Coming up",
    border: "border-l-border",
    countLabel: (n) => `${n} coming up this week`,
  },
};


function Sparkline({
  values,
  color = "stroke-primary",
}: {
  values: number[];
  color?: string;
}) {
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
      <polyline
        points={points.join(" ")}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={color}
      />
    </svg>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────

interface SparkStat {
  label: string;
  value: string;
  data: number[];
  trend: "up" | "down" | "flat";
  trendGood: boolean;
  sparkColor: string;
}

function buildStatsConfig(today: DailyStat | null, history: DailyStat[]): SparkStat[] {
  const get = (key: keyof DailyStat) => history.map((s) => Number(s[key]));
  const fmt = (v: number | null | undefined, suffix = "") =>
    v != null ? `${v}${suffix}` : "—";
  const fmtMins = (m: number | null | undefined) => {
    if (m == null) return "—";
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };
  return [
    { label: "Handled today", value: fmt(today?.handled), data: get("handled"), trend: "up", trendGood: true, sparkColor: "stroke-emerald-500" },
    { label: "Ready to send", value: fmt(today?.ready_to_send), data: get("ready_to_send"), trend: "up", trendGood: false, sparkColor: "stroke-amber-400" },
    { label: "Active leads", value: fmt(today?.active_leads), data: get("active_leads"), trend: "up", trendGood: true, sparkColor: "stroke-primary" },
    { label: "Response rate", value: fmt(today?.response_rate, "%"), data: get("response_rate"), trend: "up", trendGood: true, sparkColor: "stroke-emerald-500" },
    { label: "Avg reply time", value: fmtMins(today?.avg_reply_mins), data: get("avg_reply_mins"), trend: "down", trendGood: true, sparkColor: "stroke-emerald-500" },
  ];
}


function StatsRow({ stats, todayStat }: { stats: DailyStat[]; todayStat: DailyStat | null }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {buildStatsConfig(todayStat, stats).map((s) => {
        const TrendIcon =
          s.trend === "up" ? ArrowUp : s.trend === "down" ? ArrowDown : null;
        const trendColor = s.trendGood ? "text-emerald-500" : "text-amber-500";
        return (
          <Card
            key={s.label}
            className="rounded-2xl border-none ring-1 ring-border bg-background shadow-sm py-0 gap-0 overflow-hidden"
          >
            <CardContent className="flex items-center justify-between p-4 py-3.5 gap-2">
              <div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.label}
                </p>
                {TrendIcon && (
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-0.5 text-[10px] font-medium",
                      trendColor,
                    )}
                  >
                    <TrendIcon className="size-3" />
                    <span>
                      {s.trend === "up"
                        ? "+2 vs yesterday"
                        : "−12m vs yesterday"}
                    </span>
                  </div>
                )}
              </div>
              <Sparkline values={s.data} color={s.sparkColor} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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
  activities,
  queueItems,
  onDismiss,
  onChipClick,
}: {
  firstName: string;
  activities: Activity[];
  queueItems: QueueItem[];
  onDismiss: () => void;
  onChipClick: (itemId: string) => void;
}) {
  const chips = [
    queueItems.find((q) => q.grp === "decisions"),
    queueItems.find((q) => q.grp === "ready"),
    queueItems.find((q) => q.grp === "reach-out"),
  ].filter(Boolean) as QueueItem[];

  const sentCount = activities.filter((a) => a.status === "sent").length;
  const decisionCount = queueItems.filter((q) => q.grp === "decisions").length;
  const readyCount = queueItems.filter((q) => q.grp === "ready").length;
  const reachCount = queueItems.filter((q) => q.grp === "reach-out").length;

  const briefSentence =
    `The AI handled ${sentCount} conversation${sentCount !== 1 ? "s" : ""} overnight.` +
    (decisionCount > 0
      ? ` ${decisionCount === 1 ? "One thread needs" : `${decisionCount} threads need`} your decision.`
      : "") +
    (readyCount > 0
      ? ` ${readyCount} ${readyCount === 1 ? "reply is" : "replies are"} ready to send.`
      : "") +
    (reachCount > 0
      ? ` ${reachCount} ${reachCount === 1 ? "person needs" : "people need"} a follow-up today.`
      : "");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[480px] rounded-2xl bg-white px-8 py-7 shadow-2xl text-black">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full text-black/40 hover:bg-black/5 transition-colors"
        >
          <X className="size-4" />
        </button>
        <p className="text-xs font-medium uppercase tracking-widest text-black/40">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h2 className="mt-1.5 text-2xl font-bold text-black">
          {getGreeting()}, {firstName}.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/70">
          {briefSentence}
        </p>
        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  onDismiss();
                  onChipClick(chip.id);
                }}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {chip.client?.name ?? "Unknown"}
                <span className="opacity-70">·</span>
                <span className="opacity-90">
                  {chip.grp === "decisions"
                    ? "Review now"
                    : chip.grp === "ready"
                      ? "Send reply"
                      : "Reach out"}
                </span>
              </button>
            ))}
          </div>
        )}
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
            Get started <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

type ActivityFilter = "all" | ActivityStatus;

function ActivityFeed({
  activities,
  selectedId,
  onSelect,
}: {
  activities: Activity[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const filterTabs: { key: ActivityFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "sent", label: "Sent" },
    { key: "pending", label: "Pending" },
    { key: "needs-call", label: "Needs call" },
  ];

  const visible =
    filter === "all"
      ? activities
      : activities.filter((a) => a.status === filter);

  return (
    <Card className="flex flex-col rounded-2xl border-none ring-1 ring-border bg-background shadow-sm py-0 gap-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="font-semibold">AI Activity</p>
          <p className="text-xs text-muted-foreground">
            What the AI handled today
          </p>
        </div>
        <div className="flex gap-1">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {visible.map((a) => {
          const cfg = statusConfig[a.status];
          const icon = channelIcon[a.channel];
          const isSelected = selectedId === a.id;
          return (
            <div key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : a.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40",
                  isSelected && "bg-muted/60",
                )}
              >
                <span
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", cfg.dot)}
                />
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  {icon ? (
                    <img src={icon.src} alt={icon.alt} className="size-4" />
                  ) : (
                    <Mail className="size-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{a.client?.name ?? "Unknown"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(a.acted_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.summary}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-[10px]", cfg.badge)}
                >
                  {cfg.label}
                </Badge>
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Slide Over Panel ─────────────────────────────────────────────────────────

function DetailSlideOverPanel({
  activity,
  threadMessages,
  onClose,
  onAction,
}: {
  activity: Activity | null;
  threadMessages: ThreadMessage[];
  onClose: () => void;
  onAction: (actionType: string, activityId: string) => void;
}) {
  if (!activity) return null;
  const cfg = statusConfig[activity.status];
  const icon = channelIcon[activity.channel];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background shadow-sm">
              {icon ? (
                <img src={icon.src} alt={icon.alt} className="size-4" />
              ) : (
                <Mail className="size-3.5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">{activity.client?.name ?? "Unknown"}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{activity.channel}</span>
                <span>•</span>
                <span>{new Date(activity.acted_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-lg mb-2">{activity.summary}</h3>
                <Badge variant="outline" className={cfg.badge}>
                  <span className={cn("size-1.5 rounded-full mr-1.5", cfg.dot)} />
                  {cfg.label}
                </Badge>
              </div>
            </div>

            {(activity.client?.email || activity.client?.phone) && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contact Details</h4>
                {activity.client?.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span>{activity.client?.email}</span>
                  </div>
                )}
                {activity.client?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-3.5 text-muted-foreground" />
                    <span>{activity.client?.phone}</span>
                  </div>
                )}

              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Original Message</h4>
              <div className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed border border-border/50">
                {activity.client_message ?? ""}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Draft</h4>
              <div className="rounded-xl bg-background shadow-sm border border-border p-4 text-sm leading-relaxed relative">
                <div className="absolute -top-2.5 -left-2.5 size-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                  <Bot className="size-3" />
                </div>
                {activity.ai_draft ?? ""}
              </div>
            </div>

            {threadMessages.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previous Context</h4>
                <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-border/50">
                  {threadMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-4 relative z-10">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center shrink-0 border border-border shadow-sm",
                        msg.from_party === "you" ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {msg.from_party === "you" ? <Bot className="size-3.5" /> : <User className="size-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold">{msg.from_party === "you" ? "AI / You" : "Client"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.sent_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{msg.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background p-4 flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
          {activity.status === "pending" && (
            <>
              <Button onClick={() => onAction("approve_draft", activity.id)} className="flex-1 gap-2 rounded-xl h-10"><Send className="size-3.5" /> Approve &amp; Send</Button>
              <Button onClick={() => onAction("edit_draft", activity.id)} variant="outline" className="flex-1 rounded-xl h-10 border-border bg-background hover:bg-muted">Edit Draft</Button>
            </>
          )}
          {activity.status === "needs-call" && (
            <>
              <Button onClick={() => onAction("review_reply", activity.id)} className="flex-1 gap-2 rounded-xl h-10"><MessageSquare className="size-3.5" /> Review &amp; Reply</Button>
              <Button onClick={() => onAction("dismiss_alert", activity.id)} variant="outline" className="flex-1 rounded-xl h-10 border-border bg-background hover:bg-muted">Dismiss Alert</Button>
            </>
          )}
          {activity.status === "sent" && (
            <>
              <Button onClick={() => onAction("send_followup", activity.id)} variant="outline" className="flex-1 gap-2 rounded-xl h-10 border-border bg-background hover:bg-muted"><MessageSquare className="size-3.5" /> Send Follow-up</Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Priority Queue ────────────────────────────────────────────────────────────

const groupOrder: QueueGroup[] = [
  "decisions",
  "ready",
  "reach-out",
  "coming-up",
];

function PriorityQueue({ queueItems, highlightId }: { queueItems: QueueItem[]; highlightId: string | null }) {
  const grouped = groupOrder
    .map((g) => ({
      group: g,
      items: queueItems.filter((q) => q.grp === g),
      config: queueConfig[g],
    }))
    .filter((g) => g.items.length > 0);

  if (queueItems.length === 0) {
    return (
      <Card className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-none ring-1 ring-border bg-background p-6 text-muted-foreground shadow-sm">
        <CheckCircle2 className="size-8 opacity-30" />
        <p className="text-sm">Nothing needs attention — AI has it covered ✓</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col rounded-2xl border-none ring-1 ring-border bg-background shadow-sm py-0 gap-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="font-semibold">Your queue</p>
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {queueItems.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {grouped.map(({ group, items, config }) => (
          <div key={group} className="px-5 py-3.5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {config.countLabel(items.length)}
            </p>
            {items.map((item) => (
              <div
                key={item.id}
                id={`queue-${item.id}`}
                className={cn(
                  "rounded-xl border-l-4 bg-muted/40 px-3 py-3 transition-all",
                  config.border,
                  highlightId === item.id &&
                    "ring-2 ring-primary ring-offset-1",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.client?.name ?? "Unknown"}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.reason}
                    </p>
                    {item.due_date && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        <span>{item.due_date}</span>
                      </div>
                    )}
                  </div>
                  {group !== "coming-up" && (
                    <button
                      type="button"
                      className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      {group === "decisions"
                        ? "Review"
                        : group === "ready"
                          ? "Send"
                          : "Draft reply"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── TodayView (new wired version) ─────────────────────────────────────────────

export function TodayView({
  userName,
  userPicture,
}: {
  userName?: string;
  userPicture?: string;
}) {
  const firstName = userName?.split(" ")[0] ?? "there";
  const [showBrief, setShowBrief] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [todayStat, setTodayStat] = useState<DailyStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Record<string, ThreadMessage[]>>({});

  useEffect(() => {
    fetch("/api/dashboard/today")
      .then((r) => r.json())
      .then((data) => {
        setActivities(data.activities ?? []);
        setQueueItems(data.queueItems ?? []);
        setStats(data.stats ?? []);
        setTodayStat(data.todayStat ?? null);
        setMessages(data.messages ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  const activeActivity = selectedActivityId
    ? activities.find((a) => a.id === selectedActivityId) ?? null
    : null;

  useEffect(() => {
    if (!localStorage.getItem(getBriefDismissedKey())) setShowBrief(true);
  }, []);

  useEffect(() => {
    if (!showBrief) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissBrief();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBrief]);

  function dismissBrief() {
    localStorage.setItem(getBriefDismissedKey(), "1");
    setShowBrief(false);
  }

  function handleChipClick(itemId: string) {
    setHighlightId(itemId);
    setTimeout(() => {
      document
        .getElementById(`queue-${itemId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightId(null), 2500);
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAction(actionType: string, activityId: string) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Optimistic UI updates
    if (actionType === "approve_draft") {
      setActivities((prev) => prev.map((a) => a.id === activityId ? { ...a, status: "sent" } : a));
      setQueueItems((prev) => prev.filter((q) => q.activity_id !== activityId));
      setSelectedActivityId(null);
    } else if (actionType === "dismiss_alert") {
      setQueueItems((prev) => prev.filter((q) => q.activity_id !== activityId));
      setSelectedActivityId(null);
    }
    
    try {
      await fetch("/api/dashboard/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, activityId }),
      });
    } catch (e) {
      console.error(e);
      // Ideally revert optimistic updates here on failure
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DetailSlideOverPanel
        activity={activeActivity}
        threadMessages={activeActivity?.conversation_id ? (messages[activeActivity.conversation_id] ?? []) : []}
        onClose={() => setSelectedActivityId(null)}
        onAction={handleAction}
      />
      {showBrief && (
        <MorningBrief
          firstName={firstName}
          activities={activities}
          queueItems={queueItems}
          onDismiss={dismissBrief}
          onChipClick={handleChipClick}
        />
      )}
      <div className="space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <div className="size-3 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span>Loading your data…</span>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-0.5 text-4xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
        </div>
        <StatsRow stats={stats} todayStat={todayStat} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.65fr]">
          <ActivityFeed
            activities={activities}
            selectedId={selectedActivityId}
            onSelect={setSelectedActivityId}
          />
          <PriorityQueue queueItems={queueItems} highlightId={highlightId} />
        </div>
      </div>
    </>
  );
}
