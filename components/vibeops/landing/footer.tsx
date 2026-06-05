"use client";

/* eslint-disable @next/next/no-img-element */

import { Lock, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LandingFooter() {
  const router = useRouter();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-background text-muted-foreground py-16 mt-12 relative overflow-hidden border-t border-border/40">
      {/* Subtle background glow */}
      <div className="absolute bottom-0 right-0 size-80 rounded-full bg-primary/5 blur-[120px] -z-10" />

      <div className="mx-auto w-full px-12">
        {/* Large Footer CTA Card */}
        <div className="relative rounded-3xl bg-primary p-8 sm:p-12 md:p-16 overflow-hidden mb-16 text-center shadow-xl text-primary-foreground">
          {/* Glowing gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent)] opacity-20" />
          <div className="absolute -top-12 -left-12 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -right-12 size-40 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <Badge className="bg-white/15 text-white border border-white/25 py-1 px-3 hover:bg-white/20 transition-colors">
              <Sparkles className="size-3.5 mr-1.5 fill-white text-white animate-pulse" />
              Build a client communication system that works
            </Badge>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Focus on coding. Let AI queue your client updates.
            </h3>
            <p className="text-sm text-white/80 max-w-lg mx-auto leading-relaxed">
              Connect WhatsApp, Gmail, Outlook, Notion, and Instagram. Get
              started today and get a reviewed, tone-matched queue of replies
              that you control.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button
                onClick={() => router.push("/onboarding")}
                size="lg"
                className="bg-white hover:bg-zinc-100 text-primary font-bold shadow-lg transition-all"
              >
                Get Started for Free
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand details */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/product-logo.svg"
                alt="VibeOps Logo"
                className="size-8 object-contain"
              />
              <span className="text-base font-bold tracking-tight text-foreground uppercase">
                VibeOps
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI client communication command center for solo developers and
              small freelance studios. Connect platforms, manage scope
              boundaries, and stay in control.
            </p>
            <p className="text-[10px] text-muted-foreground">
              &copy; {new Date().getFullYear()} VibeOps. All rights reserved.
            </p>
          </div>

          {/* Links columns */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="hover:text-primary transition-colors cursor-pointer text-muted-foreground text-left"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("features")}
                  className="hover:text-primary transition-colors cursor-pointer text-muted-foreground text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("video-demo")}
                  className="hover:text-primary transition-colors cursor-pointer text-muted-foreground text-left"
                >
                  Video Tour
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/pricing")}
                  className="hover:text-primary transition-colors cursor-pointer text-muted-foreground text-left"
                >
                  Pricing Packages
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Integrations
            </h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <img src="/whatsapp-icon.svg" alt="" className="size-3" />
                <span>WhatsApp Business</span>
              </li>
              <li className="flex items-center gap-2">
                <img src="/gmail.svg" alt="" className="size-3" />
                <span>Gmail Threads</span>
              </li>
              <li className="flex items-center gap-2">
                <img src="/notion.svg" alt="" className="size-3" />
                <span>Notion Databases</span>
              </li>
              <li className="flex items-center gap-2">
                <img src="/microsoft-outlook.svg" alt="" className="size-3" />
                <span>Outlook Mail</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Security & Trust
            </h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Lock className="size-3 text-muted-foreground shrink-0" />
                <span>Private client database</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="size-3 text-muted-foreground shrink-0" />
                <span>No automated responses</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="size-3 text-muted-foreground shrink-0" />
                <span>Cancel plan anytime</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
