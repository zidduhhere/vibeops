"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export function LandingHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isAtTop, setIsAtTop] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      setIsAtTop(window.scrollY < 10);
      setIsScrolling(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full transition-all duration-300 transform",
      isAtTop 
        ? "bg-transparent border-b border-transparent backdrop-blur-none" 
        : "bg-background/30 border-b border-border/10 backdrop-blur-md shadow-none",
      isScrolling ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
    )}>
      <div className="mx-auto flex h-16 w-full items-center justify-between px-12">
        <div 
          className="flex items-center gap-2.5 cursor-pointer" 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img 
            src="/product-logo.svg" 
            alt="VibeOps Logo" 
            className="size-8 object-contain" 
          />
        </div>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => scrollToSection("how-it-works")} 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button 
            onClick={() => scrollToSection("video-demo")} 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Video Tour
          </button>
          <button 
            onClick={() => scrollToSection("features")} 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Features
          </button>
        </nav>

        {/* Right Controls */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/pricing")} className="text-sm font-medium">
            Check Pricing
          </Button>
          {user ? (
            <>
              <Button variant="outline" onClick={() => router.push("/dashboard")} className="text-sm font-medium flex items-center gap-1.5">
                <LayoutDashboard className="size-4" />
                Dashboard
              </Button>
              <Button variant="ghost" onClick={logout} className="text-sm font-medium flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200">
                <LogOut className="size-4" />
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => router.push("/login")} className="text-sm font-medium">
                Log In
              </Button>
              <Button onClick={() => router.push("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/40 bg-background/95 px-4 py-4 space-y-3">
          <button 
            onClick={() => scrollToSection("how-it-works")} 
            className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            How It Works
          </button>
          <button 
            onClick={() => scrollToSection("video-demo")} 
            className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Video Tour
          </button>
          <button 
            onClick={() => scrollToSection("features")} 
            className="block w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Features
          </button>
          <hr className="border-border/40" />
          <div className="flex flex-col gap-2 pt-1">
            <Button variant="outline" onClick={() => router.push("/pricing")} className="w-full">
              Check Pricing
            </Button>
            {user ? (
              <>
                <Button onClick={() => { setMobileMenuOpen(false); router.push("/dashboard"); }} className="w-full flex items-center justify-center gap-2">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Button>
                <Button variant="outline" onClick={() => { setMobileMenuOpen(false); logout(); }} className="w-full flex items-center justify-center gap-2 text-zinc-500 border-zinc-800">
                  <LogOut className="size-4" />
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setMobileMenuOpen(false); router.push("/login"); }} className="w-full">
                  Log In
                </Button>
                <Button onClick={() => { setMobileMenuOpen(false); router.push("/signup"); }} className="w-full">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
