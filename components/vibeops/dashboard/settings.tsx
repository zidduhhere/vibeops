"use client";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Loader2, X } from "lucide-react";

const sections = ["Profile", "Brand Identity", "AI Behaviour", "Channels", "Notifications", "Billing"];

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
    { id: "gmail", name: "Gmail", icon: "/gmail.svg", status: "Not connected", detail: "Click to connect", live: false },
    { id: "whatsapp", name: "WhatsApp", icon: "/whatsapp-icon.svg", status: "Coming soon", detail: "Not yet available", live: false },
    { id: "outlook", name: "Outlook", icon: "/microsoft-outlook.svg", status: "Coming soon", detail: "Not yet available", live: false },
    { id: "notion", name: "Notion", icon: "/notion.svg", status: "Coming soon", detail: "Not yet available", live: false },
  ]);

  const [brandIdentity, setBrandIdentity] = useState({
    logoUrl: "",
    brandColor: "#000000",
    signatureName: "",
    signatureTitle: "",
    companyName: "",
    phone: "",
    website: "",
    linkedin: "",
    twitter: "",
    ctaText: "",
    ctaLink: "",
    tone: "Professional & Direct",
    customDirectives: "",
    applyColorToName: true
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/settings/profile")
      .then(res => res.json())
      .then(data => {
        if (data.brandIdentity) {
          setBrandIdentity(prev => ({ ...prev, ...data.brandIdentity }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveBrandIdentity = async () => {
    setSavingBranding(true);
    try {
      await fetch("/api/dashboard/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandIdentity })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/dashboard/settings/upload-logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setBrandIdentity({ ...brandIdentity, logoUrl: data.url });
      } else {
        alert(data.error || "Failed to upload logo.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    fetch("/api/dashboard/settings/channels")
      .then(res => res.json())
      .then(data => {
        if (data.connections) {
          setChannels(prev => prev.map(ch => {
            const conn = data.connections.find((c: any) => c.channel === ch.id);
            if (conn) {
              return { ...ch, status: "Connected", live: true, detail: conn.account_label || "Connected" };
            }
            return ch;
          }));
        }
      })
      .catch(console.error);
  }, []);

  // ── WhatsApp connect modal state ────────────────────────────────────────────
  const [waModalOpen, setWaModalOpen]         = useState(false);
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waAccessToken, setWaAccessToken]     = useState("");
  const [waConnecting, setWaConnecting]       = useState(false);
  const [waError, setWaError]                 = useState("");

  const handleConnectWhatsApp = async () => {
    if (!waPhoneNumberId.trim() || !waAccessToken.trim()) {
      setWaError("Both fields are required.");
      return;
    }
    setWaConnecting(true);
    setWaError("");
    try {
      const res = await fetch("/api/integrations/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId: waPhoneNumberId.trim(), accessToken: waAccessToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWaError(data.detail ?? data.error ?? "Connection failed.");
      } else {
        const label = data.displayPhone ?? waPhoneNumberId;
        setChannels(prev => prev.map(c =>
          c.id === "whatsapp" ? { ...c, status: "Connected", live: true, detail: label } : c
        ));
        setWaModalOpen(false);
        setWaPhoneNumberId("");
        setWaAccessToken("");
      }
    } catch (err) {
      console.error(err);
      setWaError("Network error. Please try again.");
    } finally {
      setWaConnecting(false);
    }
  };

  const handleDisconnect = async (ch: any) => {
    const endpoint =
      ch.id === "gmail"     ? "/api/integrations/gmail/disconnect" :
      ch.id === "whatsapp"  ? "/api/integrations/whatsapp/disconnect" :
      null;
    if (!endpoint) {
      alert(`Disconnected from ${ch.name}`);
      return;
    }
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        setChannels(prev => prev.map(c =>
          c.id === ch.id ? { ...c, status: "Disconnected", live: false, detail: "Not connected" } : c
        ));
      } else {
        alert(`Failed to disconnect ${ch.name}.`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    }
  };

  const toggle = (obj: Record<string, boolean>, key: string, setter: (v: any) => void) =>
    setter((prev: Record<string, boolean>) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex items-start gap-6">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 sticky top-0 pt-2">
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
      <div className="flex-1">
        <div className={cn("space-y-6 pb-20", activeSection === "Brand Identity" ? "w-full max-w-none lg:pr-10" : "max-w-2xl")}>

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

          {activeSection === "Brand Identity" && (
            <div className="rounded-3xl border border-border bg-background p-8 shadow-sm flex flex-col lg:flex-row gap-10 items-start w-full">
              
              {/* Live Preview Pane (Left) */}
              <div className="w-full lg:w-[460px] bg-muted/30 rounded-2xl p-6 border border-border/50 sticky top-6 shrink-0 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-700">
                   <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Signature Preview
                </h3>
                
                <div className="bg-background border border-border/80 rounded-xl shadow-sm text-sm overflow-hidden relative backdrop-blur-sm">
                  {/* Email header mock */}
                  <div className="bg-muted/40 border-b border-border/60 px-4 py-3 flex gap-2 items-center">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                    </div>
                    <div className="ml-3 text-[11px] font-medium text-muted-foreground/80 font-mono tracking-tight">Re: Project Inquiry — Reply</div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <p className="text-foreground/80 leading-relaxed text-[13px]">Hi there,</p>
                      <p className="text-foreground/80 leading-relaxed text-[13px]">Thanks for reaching out! I've reviewed your request and I'd love to learn more about your goals. We have availability starting next month.</p>
                      <p className="text-foreground/80 leading-relaxed text-[13px]">Let's jump on a quick call to discuss the details.</p>
                      <p className="text-foreground/80 leading-relaxed text-[13px] pt-2">Best regards,</p>
                    </div>
                    
                    {/* The Signature */}
                    <div className="flex items-start gap-4 border-t border-border/40 pt-5 mt-8">
                      {brandIdentity.logoUrl && (
                        <div className="shrink-0 p-1.5 bg-background border border-border/40 rounded-xl shadow-sm">
                          <img src={brandIdentity.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                        </div>
                      )}
                      <div className="text-xs space-y-1.5">
                        <p className="font-bold text-[15px] tracking-tight" style={{ color: brandIdentity.applyColorToName ? (brandIdentity.brandColor || 'currentColor') : 'currentColor' }}>{brandIdentity.signatureName || "Your Name"}</p>
                        
                        {(brandIdentity.signatureTitle || brandIdentity.companyName) && (
                          <p className="font-medium text-muted-foreground text-[11px] tracking-wide uppercase">
                            {brandIdentity.signatureTitle}
                            {brandIdentity.signatureTitle && brandIdentity.companyName && <span className="mx-2 opacity-40">|</span>}
                            {brandIdentity.companyName}
                          </p>
                        )}
                        
                        {(brandIdentity.phone || brandIdentity.website) && (
                          <div className="flex items-center gap-2.5 pt-1 text-muted-foreground/80 font-mono text-[10px]">
                            {brandIdentity.phone && <span>{brandIdentity.phone}</span>}
                            {brandIdentity.phone && brandIdentity.website && <span className="w-1 h-1 rounded-full bg-border"></span>}
                            {brandIdentity.website && <span>{brandIdentity.website}</span>}
                          </div>
                        )}
                        
                        {(brandIdentity.linkedin || brandIdentity.twitter) && (
                          <div className="flex items-center gap-3 pt-1.5">
                            {brandIdentity.linkedin && <span className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer font-medium text-[11px]">LinkedIn</span>}
                            {brandIdentity.twitter && <span className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer font-medium text-[11px]">X (Twitter)</span>}
                          </div>
                        )}
                        
                        {(brandIdentity.ctaText && brandIdentity.ctaLink) && (
                           <div className="pt-3">
                             <a href={brandIdentity.ctaLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80" style={{ backgroundColor: brandIdentity.brandColor ? `${brandIdentity.brandColor}15` : '#f3f4f6', color: brandIdentity.brandColor || '#000' }}>
                               {brandIdentity.ctaText}
                               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                             </a>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form (Right) */}
              <div className="flex-1 space-y-10">
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold tracking-tight mb-1">Visual Signature</h2>
                    <p className="text-sm text-muted-foreground">Define the aesthetic details attached to your AI-drafted emails.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Full Name</label>
                      <input type="text" value={brandIdentity.signatureName} onChange={(e) => setBrandIdentity({...brandIdentity, signatureName: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Job Title</label>
                      <input type="text" value={brandIdentity.signatureTitle} onChange={(e) => setBrandIdentity({...brandIdentity, signatureTitle: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Company Name</label>
                    <input type="text" value={brandIdentity.companyName} onChange={(e) => setBrandIdentity({...brandIdentity, companyName: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Phone</label>
                      <input type="text" value={brandIdentity.phone} onChange={(e) => setBrandIdentity({...brandIdentity, phone: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Website URL</label>
                      <input type="text" value={brandIdentity.website} onChange={(e) => setBrandIdentity({...brandIdentity, website: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">LinkedIn URL</label>
                      <input type="text" value={brandIdentity.linkedin} onChange={(e) => setBrandIdentity({...brandIdentity, linkedin: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">X (Twitter) URL</label>
                      <input type="text" value={brandIdentity.twitter} onChange={(e) => setBrandIdentity({...brandIdentity, twitter: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Logo Image URL</label>
                    <div className="flex gap-3">
                      <input type="text" placeholder="https://example.com/logo.png" value={brandIdentity.logoUrl} onChange={(e) => setBrandIdentity({...brandIdentity, logoUrl: e.target.value})} className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                      <label className="flex items-center justify-center bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-all shadow-sm active:scale-95">
                        {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      </label>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Brand Color (Hex)</label>
                    <div className="flex gap-6 items-center">
                      <div className="flex gap-3 items-center">
                        <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-border shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all shadow-sm">
                          <input type="color" value={brandIdentity.brandColor} onChange={(e) => setBrandIdentity({...brandIdentity, brandColor: e.target.value})} className="absolute -inset-2 h-16 w-16 cursor-pointer" />
                        </div>
                        <input type="text" value={brandIdentity.brandColor} onChange={(e) => setBrandIdentity({...brandIdentity, brandColor: e.target.value})} className="w-32 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase font-mono shadow-sm tracking-widest" />
                      </div>
                      
                      <div className="flex items-center gap-3 bg-muted/50 px-4 py-2.5 rounded-xl border border-border/50">
                        <Toggle checked={brandIdentity.applyColorToName} onChange={() => setBrandIdentity({...brandIdentity, applyColorToName: !brandIdentity.applyColorToName})} />
                        <span className="text-sm font-medium">Apply color to Name</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-6">
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">Promotional CTA (Optional)</label>
                    <p className="text-xs text-muted-foreground mb-4">Add a subtle call-to-action button to the bottom of your signature.</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase">CTA Text</label>
                        <input type="text" placeholder="e.g. Book a call with me" value={brandIdentity.ctaText} onChange={(e) => setBrandIdentity({...brandIdentity, ctaText: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase">CTA Link</label>
                        <input type="text" placeholder="https://calendly.com/..." value={brandIdentity.ctaLink} onChange={(e) => setBrandIdentity({...brandIdentity, ctaLink: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-8">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold tracking-tight mb-1">Conversational Persona</h2>
                    <p className="text-sm text-muted-foreground">Instruct the AI on how to sound when drafting emails on your behalf.</p>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Tone of Voice</label>
                    <select value={brandIdentity.tone} onChange={(e) => setBrandIdentity({...brandIdentity, tone: e.target.value})} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none cursor-pointer">
                      <option value="Professional & Direct">Professional & Direct</option>
                      <option value="Warm & Friendly">Warm & Friendly</option>
                      <option value="Creative & Witty">Creative & Witty</option>
                      <option value="Academic & Formal">Academic & Formal</option>
                    </select>
                  </div>

                  <div className="mb-8">
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Custom AI Directives</label>
                    <textarea 
                      value={brandIdentity.customDirectives}
                      onChange={(e) => setBrandIdentity({...brandIdentity, customDirectives: e.target.value})}
                      placeholder="e.g. Always refer to clients as 'Partners'. Never apologize for slow responses. Keep emails under 3 paragraphs."
                      className="w-full min-h-[120px] rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm resize-y"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveBrandIdentity}
                    disabled={savingBranding}
                    className="rounded-xl bg-foreground px-8 py-3 text-sm font-bold text-background hover:bg-foreground/90 transition-all disabled:opacity-50 shadow-md active:scale-95"
                  >
                    {savingBranding ? "Saving..." : "Save Identity"}
                  </button>
                </div>
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
                  ) : ch.id === "gmail" ? (
                    <a href="/api/integrations/gmail?returnTo=/dashboard" className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors text-foreground">
                      Connect
                    </a>
                  ) : ch.id === "whatsapp" ? (
                    <button
                      type="button"
                      onClick={() => { setWaModalOpen(true); setWaError(""); }}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors text-foreground"
                    >
                      Connect
                    </button>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{ch.status}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── WhatsApp Connect Modal ─────────────────────────────────────── */}
          {waModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl mx-4">
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#25D366]/10">
                    <img src="/whatsapp-icon.svg" alt="WhatsApp" className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Connect WhatsApp</h3>
                    <p className="text-xs text-muted-foreground">WhatsApp Business Cloud API</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone Number ID</label>
                    <input
                      type="text"
                      value={waPhoneNumberId}
                      onChange={e => setWaPhoneNumberId(e.target.value)}
                      placeholder="e.g. 123456789012345"
                      className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">Found in Meta Developer Portal → WhatsApp → API Setup</p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Access Token</label>
                    <input
                      type="password"
                      value={waAccessToken}
                      onChange={e => setWaAccessToken(e.target.value)}
                      placeholder="EAAxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">Temporary or permanent token from Meta dashboard</p>
                  </div>

                  {waError && (
                    <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
                      {waError}
                    </p>
                  )}

                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={handleConnectWhatsApp}
                      disabled={waConnecting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20bc5a] transition-colors disabled:opacity-60"
                    >
                      {waConnecting && <Loader2 className="size-4 animate-spin" />}
                      {waConnecting ? "Connecting…" : "Connect WhatsApp"}
                    </button>
                    <p className="text-center text-[10px] text-muted-foreground">
                      Webhook URL to register in Meta: <code className="font-mono text-foreground">{typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/whatsapp/webhook</code>
                    </p>
                  </div>
                </div>
              </div>
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
