"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const platformIcons = [
  { name: "WhatsApp", src: "/whatsapp-icon.svg", startX: -260, startY: -60 },
  { name: "Gmail", src: "/gmail.svg", startX: -140, startY: -220 },
  { name: "Outlook", src: "/microsoft-outlook.svg", startX: 140, startY: -220 },
  { name: "Notion", src: "/notion.svg", startX: 260, startY: -60 },
  { name: "Instagram", src: "/instagram-icon.svg", startX: 0, startY: 200 },
];

export function HowItWorksSection() {
  const scrollSectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [containerWidth, setContainerWidth] = useState(512);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollSectionRef.current) return;
      const rect = scrollSectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollRange = rect.height - viewportHeight;
      if (totalScrollRange <= 0) return;

      const currentScroll = -rect.top;
      const rawProgress = currentScroll / totalScrollRange;
      setScrollProgress(Math.min(Math.max(rawProgress, 0), 1));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Center scale for convergence: grows from 1.0 to 1.8 as other icons come in
  let centerScale = 1.0;
  const convergeEnd = 0.7;
  if (scrollProgress < convergeEnd) {
    centerScale = 1.0 + (scrollProgress / convergeEnd) * 0.8;
  } else {
    centerScale = 1.8;
  }

  return (
    <section
      id="how-it-works"
      ref={scrollSectionRef}
      className="relative h-[180vh] bg-background text-foreground"
    >
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden px-12">
        {/* Section Header */}
        <div className="absolute top-20 text-center max-w-xl px-4 z-30">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 py-0.5 px-2.5 mb-3 text-xs uppercase tracking-wider">
            Integration Flow
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Connect channels in seconds.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Scroll down to watch your channels gather into one dashboard.
          </p>
        </div>

        {/* Animation Viewport Container */}
        <div ref={containerRef} className="relative w-full max-w-lg h-[400px] flex items-center justify-center mt-12">
          {/* Connecting Lines */}
          <svg className="absolute inset-0 w-full h-[400px] pointer-events-none z-0">
            {platformIcons.map((icon) => {
              let x = 0;
              let y = 0;
              let opacity = 0;

              const convergeEnd = 0.7;
              if (scrollProgress < convergeEnd) {
                const ratio = scrollProgress / convergeEnd;
                const easedRatio = Math.pow(ratio, 1.6);
                x = icon.startX * (1 - easedRatio);
                y = icon.startY * (1 - easedRatio);
                opacity = 0.45 * (1 - ratio);
              } else {
                x = 0;
                y = 0;
                opacity = 0;
              }

              return (
                <line
                  key={`line-${icon.name}`}
                  x1={containerWidth / 2 + x}
                  y1={200 + y}
                  x2={containerWidth / 2}
                  y2={200}
                  stroke="rgba(139, 92, 246, 0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  strokeOpacity={opacity}
                />
              );
            })}
          </svg>

          {/* Center Product Logo Container */}
          <div
            className="z-10 w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center shadow-2xl shadow-black/40 transition-transform duration-100"
            style={{
              transform: `scale(${centerScale})`,
            }}
          >
            <div className="flex items-center justify-center size-14 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-inner p-2.5">
              <img
                src="/product-logo.svg"
                alt="VibeOps Logo"
                className="size-full object-contain"
              />
            </div>
          </div>

          {/* Orbiting Platform Icons contracting to center */}
          {platformIcons.map((icon) => {
            let x = 0;
            let y = 0;
            let opacity = 0;
            let scale = 0;

            const convergeEnd = 0.7; // Convergence completes at 70% scroll of this section

            if (scrollProgress < convergeEnd) {
              const ratio = scrollProgress / convergeEnd;
              // Easing curve (slightly cubic)
              const easedRatio = Math.pow(ratio, 1.6);
              x = icon.startX * (1 - easedRatio);
              y = icon.startY * (1 - easedRatio);
              opacity = 1;
              scale = 1;
            } else {
              x = 0;
              y = 0;
              // Fade out from 70% to 80% scroll
              const fadeRatio = (0.8 - scrollProgress) / 0.1;
              opacity = Math.min(Math.max(fadeRatio, 0), 1);
              scale = Math.min(Math.max(fadeRatio, 0), 1);
            }

            return (
              <div
                key={icon.name}
                className="absolute z-20 w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5 shadow-2xl shadow-black/35 flex items-center justify-center transition-all duration-75 hover:scale-105"
                style={{
                  transform: `translate(${x}px, ${y}px) scale(${scale})`,
                  opacity: opacity,
                }}
              >
                <img
                  src={icon.src}
                  alt={icon.name}
                  className="size-full object-contain"
                />
              </div>
            );
          })}
        </div>

        {/* Fading text below "Your complete command center" */}
        <div
          className="absolute bottom-20 text-center max-w-md px-4 transition-all duration-100"
          style={{
            opacity:
              scrollProgress >= 0.72
                ? Math.min(1, (scrollProgress - 0.72) / 0.18)
                : 0,
            transform: `translateY(${scrollProgress >= 0.72 ? Math.max(0, 20 * (1 - (scrollProgress - 0.72) / 0.18)) : 20}px)`,
          }}
        >
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
            <Sparkles className="size-5 text-primary text-4xl fill-primary animate-pulse " />
            Your complete command center.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Gather updates from all endpoints automatically, then approve drafts
            in one click.
          </p>
        </div>
      </div>
    </section>
  );
}
