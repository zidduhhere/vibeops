"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const sections = ["Profile", "AI Behaviour", "Channels", "Notifications", "Billing"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none", checked ? "bg-primary" : "bg-muted")}>
      <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsView({ userName, userPicture }: { userName?: string; userPicture?: string }) {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState("Profile");
  const firstName = userName?.split(" ")[0] ?? "there";

  const [aiSettings, setAiSettings] = useState({
    autoDraft: true,
    scopeDetect: true,
    proposalNudge: true,
    autoSend: false,
    dailyBrief: true,
  });

  const [notifSettings, setNotifSettings] = useState({
    flagged: true,
    draftReady: true,
    newLead: true,
    weeklyReport: false,
    email: false,
  });

  const [channels, setChannels] = useState([
    { id: "gmail", name: "Gmail", icon: "/gmail.svg", status: "Connected", detail: "abialifhere@gmail.com", live: true },
    { id: "whatsapp", name: "WhatsApp", icon: "/whatsapp-icon.svg", status: "Coming soon", detail: "Not yet available", live: false },
    { id: "outlook", name: "Outlook", icon: "/microsoft-outlook.svg", status: "Coming soon", detail: "Not yet available", live: false },
    { id: "notion", name: "Notion", icon: "/notion.svg", status: "Coming soon", detail: "Not yet available", live: false },
  ]);

  const handleDisconnect = async (ch: any) => {
    if (ch.id === "gmail") {
      try {
        const res = await fetch("/api/integrations/gmail/disconnect", { method: "POST" });
        if (res.ok) {
          setChannels(prev => prev.map(c => c.id === "gmail" ? { ...c, status: "Disconnected", live: false, detail: "Not connected" } : c));
        } else {
          alert("Failed to disconnect Gmail.");
        }
      } catch (err) {
        console.error(err);
        alert("An error occurred.");
      }
    } else {
      alert(`Disconnected from ${ch.name}`);
    }
  };

  const toggle = (obj: Record<string, boolean>, key: string, setter: (v: any) => void) =>
    setter((prev: Record<string, boolean>) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar */}
      <aside className="w-48 shrink-0">
        <nav className="space-y-0.5">
          {sections.map((s) => (
            <button key={s} type="button" onClick={() => setActiveSection(s)}
              className={cn("flex w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                activeSection === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {s}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-6">

          {activeSection === "Profile" && (
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-5">Profile</h2>
              <div className="flex items-center gap-4 mb-6">
                {userPicture ? (
                  <img src={userPicture} alt={userName} className="size-16 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium">{userName ?? "You"}</p>
                  <p className="text-xs text-muted-foreground">Solo plan · Connected via Google</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => logout()}
                  className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Log out
                </button>
              </div>
              <div className="space-y-4">
                {[["Display name", userName ?? ""], ["Email", "Connected via Auth0"], ["Plan", "Solo — $19/mo"]].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <div className="rounded-xl border border-border bg-muted px-3 py-2 text-sm">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "AI Behaviour" && (
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">AI Behaviour</h2>
              <p className="text-xs text-muted-foreground mb-5">Control what the AI does autonomously on your behalf.</p>
              <Row label="Auto-draft replies" description="AI drafts a reply for every incoming Gmail thread.">
                <Toggle checked={aiSettings.autoDraft} onChange={() => toggle(aiSettings, "autoDraft", setAiSettings)} />
              </Row>
              <Row label="Scope creep detection" description="Flag messages that request work outside the agreed project scope.">
                <Toggle checked={aiSettings.scopeDetect} onChange={() => toggle(aiSettings, "scopeDetect", setAiSettings)} />
              </Row>
              <Row label="Proposal follow-up nudges" description="Remind you to follow up when a proposal has been silent for 3 days.">
                <Toggle checked={aiSettings.proposalNudge} onChange={() => toggle(aiSettings, "proposalNudge", setAiSettings)} />
              </Row>
              <Row label="Auto-send approved drafts" description="Send drafts automatically once you approve them without a second confirm.">
                <Toggle checked={aiSettings.autoSend} onChange={() => toggle(aiSettings, "autoSend", setAiSettings)} />
              </Row>
              <Row label="Daily brief" description="Receive a morning summary of AI activity and upcoming follow-ups.">
                <Toggle checked={aiSettings.dailyBrief} onChange={() => toggle(aiSettings, "dailyBrief", setAiSettings)} />
              </Row>
            </div>
          )}

          {activeSection === "Channels" && (
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">Channels</h2>
              <p className="text-xs text-muted-foreground mb-5">Manage connected communication channels.</p>
              {channels.map((ch) => (
                <div key={ch.name} className={cn("flex items-center gap-3 py-4 border-b border-border last:border-0", !ch.live && "opacity-50")}>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                    <img src={ch.icon} alt={ch.name} className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{ch.name}</p>
                    <p className="text-xs text-muted-foreground">{ch.detail}</p>
                  </div>
                  {ch.live ? (
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">{ch.status}</span>
                      <button type="button" onClick={() => handleDisconnect(ch)} className="ml-2 rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted transition-colors">Disconnect</button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{ch.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeSection === "Notifications" && (
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">Notifications</h2>
              <p className="text-xs text-muted-foreground mb-5">Choose what triggers a notification in the app.</p>
              <Row label="Flagged messages" description="Notify when AI flags a message for manual review.">
                <Toggle checked={notifSettings.flagged} onChange={() => toggle(notifSettings, "flagged", setNotifSettings)} />
              </Row>
              <Row label="Draft ready" description="Notify when AI finishes a reply draft.">
                <Toggle checked={notifSettings.draftReady} onChange={() => toggle(notifSettings, "draftReady", setNotifSettings)} />
              </Row>
              <Row label="New lead detected" description="Notify when a new inbound message looks like a potential lead.">
                <Toggle checked={notifSettings.newLead} onChange={() => toggle(notifSettings, "newLead", setNotifSettings)} />
              </Row>
              <Row label="Weekly AI report" description="Receive a summary of AI performance every Monday.">
                <Toggle checked={notifSettings.weeklyReport} onChange={() => toggle(notifSettings, "weeklyReport", setNotifSettings)} />
              </Row>
              <Row label="Email notifications" description="Also send notifications to your email inbox.">
                <Toggle checked={notifSettings.email} onChange={() => toggle(notifSettings, "email", setNotifSettings)} />
              </Row>
            </div>
          )}

          {activeSection === "Billing" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                <h2 className="text-base font-semibold mb-4">Current Plan</h2>
                <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                  <div>
                    <p className="font-semibold">Solo</p>
                    <p className="text-xs text-muted-foreground">$19 / month · Renews Jun 28, 2026</p>
                  </div>
                  <button type="button" onClick={() => alert("Upgrade modal opened")} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Upgrade</button>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                <h2 className="text-base font-semibold mb-4">Usage this month</h2>
                {[["AI replies sent", "47 / unlimited"], ["Channels connected", "1 / 3"], ["Automations active", "4 / 6"]].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
