"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell, Bot, BriefcaseBusiness, Clock, ClipboardCheck,
  Inbox, Send, Settings, Target, Users, X, CheckCircle2,
  AlertTriangle, MessageSquare, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { TodayView } from "./dashboard/today";
import { InboxView } from "./dashboard/inbox";
import { LeadsView } from "./dashboard/leads";
import { ClientsView } from "./dashboard/clients";
import { FollowUpsView } from "./dashboard/followups";
import { AutomationsView } from "./dashboard/automations";
import { SettingsView } from "./dashboard/settings";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "ai"; text: string; }

interface Notification {
  id: string;
  type: "flagged" | "draft" | "lead" | "info";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const navItems = [
  { label: "Today",       icon: Target },
  { label: "Inbox",       icon: Inbox },
  { label: "Leads",       icon: Users },
  { label: "Clients",     icon: BriefcaseBusiness },
  { label: "Follow-ups",  icon: Clock },
  { label: "Automations", icon: ClipboardCheck },
];

const notifConfig = {
  flagged: { icon: AlertTriangle, color: "text-red-500",   bg: "bg-red-50 dark:bg-red-950" },
  draft:   { icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
  lead:    { icon: Zap,           color: "text-primary",   bg: "bg-primary/10" },
  info:    { icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardShell({
  userName,
  userPicture,
  activeNav = 0,
  onNavChange,
}: {
  userName?: string;
  userPicture?: string;
  activeNav?: number;
  onNavChange?: (index: number) => void;
}) {
  const [chatOpen,     setChatOpen]     = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Hey! I've handled 3 conversations and flagged 1 for your review today. What would you like to know?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const firstName   = userName?.split(" ")[0] ?? "there";
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetch("/api/dashboard/today")
      .then(res => res.json())
      .then(data => {
        if (data.queueItems) {
          const mapped = data.queueItems.map((q: any) => ({
            id: q.id,
            type: q.grp === "decisions" ? "flagged" : (q.grp === "ready" ? "draft" : "info"),
            title: q.grp === "decisions" ? "Decision needed" : (q.grp === "ready" ? "Draft ready" : "Information"),
            body: q.reason || "Action required",
            time: "Just now",
            read: false,
          }));
          setNotifications(mapped);
        }
      })
      .catch(err => console.error("Error fetching notifications", err));
  }, []);

  useEffect(() => {
    if (chatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  function sendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "ai", text: "I'm reviewing that now. Give me a moment to pull the context from your active threads." },
    ]);
    setChatInput("");
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // Close panels when clicking outside
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#notif-panel") && !target.closest("#notif-btn")) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const views = [
    <TodayView      key="today"       userName={userName} userPicture={userPicture} />,
    <InboxView      key="inbox" />,
    <LeadsView      key="leads" />,
    <ClientsView    key="clients" />,
    <FollowUpsView  key="followups" />,
    <AutomationsView key="automations" />,
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/30">

      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/product-logo.svg" alt="VibeOps" className="size-7 object-contain" />
          <span className="font-semibold tracking-tight">VibeOps</span>
        </div>

        {/* Nav tabs */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <button key={item.label} type="button"
                onClick={() => { setSettingsOpen(false); onNavChange?.(i); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  i === activeNav && !settingsOpen
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                <Icon className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Settings */}
          <button id="settings-btn" type="button"
            onClick={() => { setSettingsOpen((o) => !o); setNotifOpen(false); }}
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-border transition-colors",
              settingsOpen ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
            )}>
            <Settings className="size-4" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button id="notif-btn" type="button"
              onClick={() => { setNotifOpen((o) => !o); setSettingsOpen(false); }}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-full border border-border transition-colors",
                notifOpen ? "bg-foreground text-background" : "bg-background text-muted-foreground hover:text-foreground"
              )}>
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-2 items-center justify-center rounded-full bg-red-500" />
              )}
            </button>

            {/* Notification panel */}
            <div id="notif-panel" className={cn(
              "absolute right-0 top-12 z-50 flex w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200",
              notifOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            )}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button type="button" onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                {notifications.map((n) => {
                  const cfg = notifConfig[n.type];
                  const Icon = cfg.icon;
                  return (
                    <button key={n.id} type="button"
                      onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                      className={cn("flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40", !n.read && "bg-muted/30")}>
                      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                        <Icon className={cn("size-4", cfg.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm font-medium", !n.read && "font-semibold")}>{n.title}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                      </div>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Avatar */}
          {userPicture ? (
            <img src={userPicture} alt={userName} className="size-9 rounded-full object-cover border border-border" />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {firstName[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* ── Page body ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] h-full p-6">
          {settingsOpen
            ? <SettingsView userName={userName} userPicture={userPicture} />
            : (views[activeNav] ?? views[0])
          }
        </div>
      </main>

      {/* ── Floating AI button ──────────────────────────────────── */}
      <button type="button" onClick={() => setChatOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl"
        )}
        aria-label="AI Assistant">
        {chatOpen ? <X className="size-5" /> : <Bot className="size-6" />}
        {!chatOpen && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">1</span>
        )}
      </button>

      {/* ── AI Chat panel ───────────────────────────────────────── */}
      <div className={cn(
        "fixed bottom-24 right-6 z-40 flex w-[480px] h-[50vh] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300",
        chatOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-foreground px-4 py-3.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary">
            <Bot className="size-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-background">AI Assistant</p>
            <p className="text-[10px] text-background/60">Always on · monitoring Gmail</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-background/60">Active</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
              msg.role === "ai" ? "bg-muted text-foreground" : "ml-auto bg-primary text-primary-foreground"
            )}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about your clients…"
              className="h-9 flex-1 rounded-xl border border-border bg-muted px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary" />
            <button type="button" onClick={sendMessage} disabled={!chatInput.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity">
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
