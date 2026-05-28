"use client";

import { LandingHeader } from "./landing/header";
import { LandingHero } from "./landing/hero";
import { HowItWorksSection } from "./landing/how-it-works";
import { VideoDemoSection } from "./landing/video-demo";
import { FeaturesSection } from "./landing/features";
import { LandingFooter } from "./landing/footer";

export function LandingScreen({
  onStart,
}: {
  onStart: () => void;
}) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground selection:bg-primary/20">
      {/* Dynamic Keyframes injection for layout children */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-18px) rotate(-2.5deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.2); }
          50% { box-shadow: 0 0 45px rgba(139, 92, 246, 0.55); }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 9s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 5s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 3.5s ease-in-out infinite;
        }
      `}} />

      <LandingHeader />
      <LandingHero onStart={onStart} onWatchDemo={() => scrollToSection("video-demo")} />
      <HowItWorksSection />
      <VideoDemoSection />
      <FeaturesSection onStart={onStart} />
      <LandingFooter />
    </div>
  );
}
