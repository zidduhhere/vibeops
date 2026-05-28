"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Settings as SettingsIcon, Maximize, CheckCircle, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VideoDemoSection() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoStep, setVideoStep] = useState(0);
  const [typingText, setTypingText] = useState("");
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Video walkthrough step simulation loop
  useEffect(() => {
    if (isVideoPlaying) {
      videoIntervalRef.current = setInterval(() => {
        setVideoStep((prev) => (prev + 1) % 4);
      }, 5000);
    } else {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    }
    return () => {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [isVideoPlaying]);

  // Video Typing effect simulation for AI drafting step (Step 2)
  useEffect(() => {
    if (videoStep === 2 && isVideoPlaying) {
      setTypingText("");
      const fullText = "That request is useful, but it is outside the scope we agreed for this phase. I can keep our launch date on track as planned, or price this as an add-on after we launch.";
      let index = 0;
      const timer = setInterval(() => {
        setTypingText((prev) => prev + fullText.charAt(index));
        index++;
        if (index >= fullText.length) {
          clearInterval(timer);
        }
      }, 30);
      return () => clearInterval(timer);
    }
  }, [videoStep, isVideoPlaying]);

  return (
    <section id="video-demo" className="py-20 lg:py-28 bg-muted/20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[300px] rounded-full bg-primary/3 blur-3xl" />
      
      <div className="mx-auto w-full px-12">
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-12">
          <Badge variant="outline">Interactive Tour</Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            See how boundaries are enforced
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Watch a quick 4-step simulator demonstrating how VibeOps detects scope creep and automatically drafts replies.
          </p>
        </div>

        {/* Interactive Player Mockup Container */}
        <div className="max-w-6xl mx-auto rounded-3xl overflow-hidden border border-border/80 bg-zinc-950 shadow-2xl relative aspect-video flex flex-col justify-between group">
          
          {/* INACTIVE / PRE-PLAY STATE OVERLAY */}
          {!isVideoPlaying ? (
            <div 
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-35 flex flex-col items-center justify-center text-center p-6 cursor-pointer"
              onClick={() => {
                setIsVideoPlaying(true);
                setVideoStep(0);
              }}
            >
              {/* Large Pulsing Play Button */}
              <div className="relative flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105">
                <div className="absolute -inset-4 rounded-full border border-primary/30 animate-ping opacity-75" />
                <div className="size-20 bg-primary hover:bg-primary/95 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 relative z-10 transition-colors">
                  <Play className="size-8 fill-current ml-1 text-primary-foreground" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Click to start simulated workflow
              </h3>
              <p className="mt-1 text-sm text-zinc-400 max-w-xs">
                Run a live step-by-step preview of the VibeOps engine resolving a client request.
              </p>
            </div>
          ) : null}

          {/* SIMULATED PLAYBACK SCREEN */}
          <div className="flex-1 w-full bg-zinc-900 p-6 flex flex-col justify-between overflow-hidden relative">
            
            {/* Simulated UI Header bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
                <span className="text-xs text-zinc-500 ml-2 font-mono">vibeops-agent.local</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-primary/20 text-primary py-0.5 px-2 rounded-full font-semibold border border-primary/25">
                  Step {videoStep + 1} of 4: {videoStep === 0 ? "Receive" : videoStep === 1 ? "Analyze" : videoStep === 2 ? "Draft" : "Done"}
                </span>
              </div>
            </div>

            {/* SIMULATED SCENE RENDER */}
            <div className="flex-1 flex items-center justify-center relative">
              
              {/* STEP 1: Incoming WhatsApp request */}
              {videoStep === 0 && (
                <div className="w-full max-w-md bg-zinc-950 rounded-2xl border border-zinc-800 p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-2">
                    <div className="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold font-sans">
                      PS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">PeakFit Studio</p>
                      <p className="text-[9px] text-zinc-500">via WhatsApp Business</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] ml-auto">Incoming</Badge>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800/40">
                    <p className="text-xs leading-relaxed text-zinc-300 font-sans">
                      "Can you also add automatic trainer assignment and SMS reminders? Should be small only no?"
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Analyzing message keywords...</span>
                    <span className="text-primary animate-pulse">Running engine...</span>
                  </div>
                </div>
              )}

              {/* STEP 2: Scanning scope */}
              {videoStep === 1 && (
                <div className="w-full max-w-md bg-zinc-950 rounded-2xl border border-zinc-800 p-4 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="size-4 text-red-400" />
                      Scope Checker active
                    </p>
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[10px] animate-pulse">Boundary Flagged</Badge>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Original Notion Scope Document:</span>
                      <span className="text-zinc-500">vibeops_contract.md</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 space-y-1">
                      <div className="flex items-center gap-2 line-through text-zinc-600">
                        <CheckCircle className="size-3 text-zinc-700" />
                        <span>5-page website layout</span>
                      </div>
                      <div className="flex items-center gap-2 line-through text-zinc-600">
                        <CheckCircle className="size-3 text-zinc-700" />
                        <span>Contact & booking form</span>
                      </div>
                      <div className="flex items-center gap-2 text-red-400 font-bold bg-red-950/20 py-1 px-1.5 rounded border border-red-900/30">
                        <AlertTriangle className="size-3 text-red-400 shrink-0" />
                        <span>Automatic SMS notifications (NOT FOUND)</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    VibeOps detected <strong className="text-red-400">Scope Creep</strong>. Preparing a tone-matched boundary draft.
                  </p>
                </div>
              )}

              {/* STEP 3: AI Drafting reply */}
              {videoStep === 2 && (
                <div className="w-full max-w-md bg-zinc-950 rounded-2xl border border-zinc-800 p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="size-4 text-primary fill-primary" />
                      AI Draft Writer
                    </p>
                    <span className="text-[10px] text-zinc-400">Tone: <strong className="text-primary">Professional Boundary</strong></span>
                  </div>

                  <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-850 min-h-[100px] flex flex-col justify-between">
                    <p className="text-xs leading-relaxed text-zinc-200 italic font-sans font-medium">
                      "{typingText}"
                      <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Target: WhatsApp</span>
                    <span>Reviewing tone rules...</span>
                  </div>
                </div>
              )}

              {/* STEP 4: Approved & Copy */}
              {videoStep === 3 && (
                <div className="w-full max-w-md bg-zinc-950 rounded-2xl border border-emerald-500/25 p-5 shadow-2xl space-y-4 text-center animate-in scale-in duration-300">
                  <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="size-6 text-emerald-400" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">Draft Approved & Copied</h4>
                    <p className="mt-1 text-xs text-zinc-400 max-w-xs mx-auto">
                      The tone-matched response is copied to your clipboard. Paste it directly in your client chat.
                    </p>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-left space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase">
                      <span>Copied Text</span>
                      <span className="text-emerald-400">Successful</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 line-clamp-2">
                      That request is useful, but it is outside the scope we agreed for this phase...
                    </p>
                  </div>

                  <Button 
                    onClick={() => setVideoStep(0)} 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800"
                  >
                    Replay Walkthrough
                  </Button>
                </div>
              )}

            </div>

            {/* Steps control timeline indicators */}
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((step) => (
                  <button
                    key={step}
                    onClick={() => setVideoStep(step)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      videoStep === step ? "w-6 bg-primary" : "w-2 bg-zinc-800 hover:bg-zinc-700"
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">Click dots to jump step</span>
                <button 
                  onClick={() => setIsVideoPlaying(false)}
                  className="p-1 rounded text-zinc-500 hover:text-white"
                >
                  <Pause className="size-4" />
                </button>
              </div>
            </div>

          </div>

          {/* VIDEO PLAYER BOTTOM CONTROLS MOCKUP */}
          <div className="bg-zinc-950 px-4 py-3 flex items-center justify-between text-zinc-400 text-xs border-t border-zinc-900 z-20">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsVideoPlaying(!isVideoPlaying)} 
                className="p-1 text-white hover:text-primary transition-colors cursor-pointer"
              >
                {isVideoPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current" />}
              </button>
              <div className="flex items-center gap-2">
                <Volume2 className="size-4" />
                <span>0:32 / 1:15</span>
              </div>
            </div>

            {/* Progress track */}
            <div className="flex-1 mx-6 h-1 rounded bg-zinc-800 relative overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(videoStep + 1) * 25}%` }}
              />
            </div>

            <div className="flex items-center gap-3">
              <SettingsIcon className="size-4 cursor-pointer hover:text-white" />
              <Maximize className="size-4 cursor-pointer hover:text-white" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
