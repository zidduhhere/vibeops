"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutomationConfig, AutomationRun } from "@/lib/insforge";

const AUTOMATIONS = [
  { id: "1", key: "auto_draft_pricing", name: "Auto-draft pricing replies", description: "When a Gmail thread contains pricing keywords, AI drafts a discovery-first reply for your review.", category: "Leads", triggerType: "email" },
  { id: "2", key: "scope_creep_detector", name: "Scope creep detector", description: "Flags any client message requesting work outside the original proposal scope before replying.", category: "Clients", triggerType: "email" },
  { id: "3", key: "proposal_followup", name: "Proposal follow-up reminder", description: "If a proposal hasn't received a reply in 3 days, remind you and offer a draft nudge.", category: "Leads", triggerType: "time" },
  { id: "4", key: "weekly_status", name: "Weekly project status", description: "Every Friday, draft a status update for each active client based on Notion task notes.", category: "Clients", triggerType: "time" },
  { id: "5", key: "invoice_reminder", name: "Invoice reminder", description: "7 days after an invoice is sent with no payment, draft a polite reminder email.", category: "Finance", triggerType: "time" },
  { id: "6", key: "lead_qualification", name: "New lead qualification", description: "Analyse first messages from new contacts and score them on intent, budget signals, and scope clarity.", category: "Leads", triggerType: "email" },
];

const CATEGORIES = ["All", "Leads", "Clients", "Finance"];
const TONES = ["professional", "casual", "friendly"] as const;

const TRIGGER_PARAM_FIELDS: Record<string, { label: string; field: string; type: "tags" | "number" | "day" }[]> = {
  auto_draft_pricing: [{ label: "Trigger keywords", field: "keywords", type: "tags" }],
  proposal_followup: [{ label: "Days without reply", field: "delay_days", type: "number" }],
  invoice_reminder: [{ label: "Days after invoice sent", field: "days_after", type: "number" }],
};

type ConfigForm = {
  mode: "agentic" | "supervised";
  trigger_params: Record<string, unknown>;
  ai_prompt: string;
  tone: "professional" | "casual" | "friendly";
  gmail_filter: string;
};

const DEFAULT_CONFIG: ConfigForm = {
  mode: "supervised",
  trigger_params: {},
  ai_prompt: "",
  tone: "professional",
  gmail_filter: "",
};

export function AutomationsView() {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, AutomationConfig>>({});
  const [runs, setRuns] = useState<Record<string, AutomationRun[]>>({});
  const [panelKey, setPanelKey] = useState<string | null>(null);
  const [form, setForm] = useState<ConfigForm>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [automationsRes, configsRes, runsRes] = await Promise.all([
        fetch("/api/dashboard/automations").then(r => r.json()),
        fetch("/api/automations/config").then(r => r.json()),
        fetch("/api/automations/runs").then(r => r.json()),
      ]);

      if (automationsRes.automations) {
        const active = new Set<string>();
        automationsRes.automations.forEach((a: { enabled: boolean; automation_key: string }) => {
          if (a.enabled) active.add(a.automation_key);
        });
        setActiveKeys(active);
      }

      if (configsRes.configs) {
        const map: Record<string, AutomationConfig> = {};
        configsRes.configs.forEach((c: AutomationConfig) => { map[c.automation_key] = c; });
        setConfigs(map);
      }

      if (runsRes.runs) {
        const map: Record<string, AutomationRun[]> = {};
        runsRes.runs.forEach((r: AutomationRun) => {
          if (!map[r.automation_key]) map[r.automation_key] = [];
          map[r.automation_key].push(r);
        });
        setRuns(map);
      }
    } catch (err) {
      console.error("Error loading automations", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleAutomation = async (key: string, current: boolean) => {
    const nextState = !current;
    setActiveKeys(prev => {
      const next = new Set(prev);
      if (nextState) next.add(key); else next.delete(key);
      return next;
    });
    try {
      await fetch("/api/dashboard/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: key, enabled: nextState }),
      });
    } catch {
      setActiveKeys(prev => {
        const next = new Set(prev);
        if (current) next.add(key); else next.delete(key);
        return next;
      });
    }
  };

  const openPanel = (key: string) => {
    const existing = configs[key];
    setForm(existing ? {
      mode: existing.mode,
      trigger_params: existing.trigger_params as Record<string, unknown>,
      ai_prompt: existing.ai_prompt,
      tone: existing.tone,
      gmail_filter: existing.gmail_filter,
    } : DEFAULT_CONFIG);
    setPanelKey(key);
  };

  const saveConfig = async () => {
    if (!panelKey) return;
    setSaving(true);
    try {
      await fetch("/api/automations/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: panelKey, ...form }),
      });
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!panelKey) return;
    setRunningNow(true);
    try {
      const res = await fetch("/api/automations/run-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_key: panelKey }),
      });
      const data = await res.json() as { success: boolean; triggered_for?: string; message?: string };
      alert(data.success ? `Triggered for: "${data.triggered_for}"` : data.message ?? "No matching email found");
      await fetchAll();
    } finally {
      setRunningNow(false);
    }
  };

  const sendRun = async (runId: string) => {
    setSending(true);
    try {
      await fetch("/api/automations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      setSelectedRun(null);
      await fetchAll();
    } finally {
      setSending(false);
    }
  };

  const filtered = AUTOMATIONS.filter(a => filter === "All" || a.category === filter);
  const panelAutomation = AUTOMATIONS.find(a => a.key === panelKey);
  const panelRuns = panelKey ? (runs[panelKey] ?? []) : [];

  // suppress unused variable lint warning
  void loading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI rules running in the background on your behalf.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-sm font-medium">{activeKeys.size} active</span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1">
        {CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => setFilter(c)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === c ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted border border-border bg-background")}>
            {c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(automation => {
          const isActive = activeKeys.has(automation.key);
          const config = configs[automation.key];
          const runList = runs[automation.key] ?? [];
          return (
            <div key={automation.id}
              className={cn("rounded-2xl border border-border bg-background p-5 shadow-sm transition-opacity", !isActive && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="size-4 text-primary" />
                </div>
                <button type="button" onClick={() => toggleAutomation(automation.key, isActive)}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
                    isActive ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    isActive ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
              <div className="mt-3">
                <p className="font-medium text-sm">{automation.name}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{automation.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    {automation.category}
                  </span>
                  {config && (
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium",
                      config.mode === "agentic" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                      {config.mode === "agentic" ? "🤖 Agentic" : "👁️ Supervised"}
                    </span>
                  )}
                  {runList.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">{runList.length} run{runList.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                <button type="button" onClick={() => openPanel(automation.key)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors">
                  <Settings className="size-3" />
                  Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Config Slide-Over Panel */}
      {panelKey && panelAutomation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPanelKey(null)} />
          <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-background shadow-2xl overflow-y-auto">
            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <h2 className="font-semibold text-lg">{panelAutomation.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{panelAutomation.description}</p>
              </div>
              <button type="button" onClick={() => setPanelKey(null)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 p-6">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enabled</span>
                <button type="button" onClick={() => toggleAutomation(panelKey, activeKeys.has(panelKey))}
                  className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    activeKeys.has(panelKey) ? "bg-primary" : "bg-muted")}>
                  <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
                    activeKeys.has(panelKey) ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>

              {/* Mode */}
              <div>
                <label className="text-sm font-medium block mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["agentic", "supervised"] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => setForm(f => ({ ...f, mode: m }))}
                      className={cn("rounded-xl border-2 px-4 py-3 text-left transition-colors",
                        form.mode === m ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                      <p className="font-medium text-sm">{m === "agentic" ? "🤖 Agentic" : "👁️ Supervised"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m === "agentic" ? "AI sends emails automatically" : "AI drafts, you approve before sending"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger params */}
              {(TRIGGER_PARAM_FIELDS[panelKey] ?? []).map(field => (
                <div key={field.field}>
                  <label className="text-sm font-medium block mb-1.5">{field.label}</label>
                  {field.type === "number" && (
                    <input
                      type="number"
                      min={1}
                      value={(form.trigger_params[field.field] as number) ?? ""}
                      onChange={e => setForm(f => ({
                        ...f,
                        trigger_params: { ...f.trigger_params, [field.field]: Number(e.target.value) }
                      }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                  {field.type === "tags" && (
                    <input
                      type="text"
                      placeholder="pricing, budget, cost (comma-separated)"
                      value={((form.trigger_params[field.field] as string[]) ?? []).join(", ")}
                      onChange={e => setForm(f => ({
                        ...f,
                        trigger_params: { ...f.trigger_params, [field.field]: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }
                      }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
              ))}

              {/* AI Instructions */}
              <div>
                <label className="text-sm font-medium block mb-1.5">AI Instructions</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Always mention our agency name, keep replies under 3 sentences"
                  value={form.ai_prompt}
                  onChange={e => setForm(f => ({ ...f, ai_prompt: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Tone */}
              <div>
                <label className="text-sm font-medium block mb-1.5">Tone</label>
                <div className="flex gap-2">
                  {TONES.map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, tone: t }))}
                      className={cn("flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors",
                        form.tone === t ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted text-muted-foreground")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gmail filter */}
              <div>
                <label className="text-sm font-medium block mb-1.5">Gmail filter <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="label:leads or from:@company.com"
                  value={form.gmail_filter}
                  onChange={e => setForm(f => ({ ...f, gmail_filter: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Run history */}
              {panelRuns.length > 0 && (
                <div>
                  <label className="text-sm font-medium block mb-2">Run history</label>
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {panelRuns.slice(0, 10).map(run => (
                      <div key={run.id} className="flex items-center justify-between px-3 py-2.5 bg-background">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{run.trigger_email_subject ?? "—"}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(run.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                            run.status === "sent" ? "bg-emerald-500/10 text-emerald-600" :
                            run.status === "held_for_review" ? "bg-amber-500/10 text-amber-600" :
                            run.status === "failed" ? "bg-red-500/10 text-red-600" :
                            "bg-muted text-muted-foreground")}>
                            {run.status.replace("_", " ")}
                          </span>
                          <button type="button" onClick={() => setSelectedRun(run)}
                            className="text-[11px] text-primary hover:underline">
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-border p-6 flex items-center gap-3">
              <button type="button" onClick={saveConfig} disabled={saving}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={runNow} disabled={runningNow}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60">
                {runningNow ? "Running…" : "Run now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run detail modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedRun(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-sm">{selectedRun.trigger_email_subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedRun.trigger_email_from}</p>
              </div>
              <button type="button" onClick={() => setSelectedRun(null)}
                className="rounded-lg p-1.5 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="rounded-xl bg-muted p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {selectedRun.ai_output ?? selectedRun.error_message ?? "No output"}
            </div>
            {selectedRun.status === "held_for_review" && (
              <button type="button" onClick={() => sendRun(selectedRun.id)} disabled={sending}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                {sending ? "Sending…" : "Send this reply"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
