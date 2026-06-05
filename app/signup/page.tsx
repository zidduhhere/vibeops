"use client";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars */

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Sparkles, Info, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const { login, isSandbox } = useAuth();
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    setErrorMsg("");
    login(email, true, "email");
  };

  const handleSocialLogin = (connection: string) => {
    login(undefined, true, connection);
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background font-sans select-none">
      {/* LEFT SIDE: Brand Presentation (Solid Black Background) */}
      <div className="relative flex flex-col justify-between w-full lg:w-1/2 bg-zinc-950 text-white p-8 sm:p-12 lg:p-16">
        {/* Subtle grid patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 size-96 rounded-full bg-primary/5 blur-3xl -z-10" />

        {/* Top: Logo & Title */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-white border border-zinc-800 shadow-inner p-2">
            <img
              src="/product-logo.svg"
              alt="VibeOps Logo"
              className="size-full object-contain"
            />
          </div>
          <span className="text-xl font-extrabold tracking-tight uppercase text-white">
            VibeOps
          </span>
        </div>

        {/* Center: Premium CTA Title */}
        <div className="relative z-10 my-auto py-12 lg:py-0 max-w-lg space-y-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1] sm:max-w-md">
            Start building with your free plan
          </h2>
          <p className="text-lg text-zinc-400 font-medium">
            No credit card required. Connect client channels and auto-draft
            boundaries instantly.
          </p>
        </div>

        {/* Bottom: Footer Info & Social Links */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-zinc-900 text-xs text-zinc-500">
          <span>
            &copy; {new Date().getFullYear()} VibeOps, Inc. All Rights Reserved.
          </span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">
              X
            </a>
            <a href="#" className="hover:text-white transition-colors">
              LinkedIn
            </a>
            <a href="#" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Card (Abstract Gradient Blur Background) */}
      <div className="relative flex items-center justify-center w-full lg:w-1/2 p-6 sm:p-12 bg-zinc-50 overflow-hidden">
        {/* Colorful background gradient blurs similar to the uploaded mockup */}
        <div className="absolute -top-40 -right-40 size-[500px] rounded-full bg-purple-500/15 blur-[120px] -z-10 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 size-[500px] rounded-full bg-orange-400/10 blur-[120px] -z-10 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[450px] rounded-full bg-blue-500/15 blur-[140px] -z-10" />

        {/* Signup Card */}
        <div className="w-full max-w-[440px] rounded-3xl bg-white border border-zinc-200/80 p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.04)] relative z-10">
          {/* Sandbox Indicator Banner */}
          {isSandbox && (
            <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-500 animate-pulse" />
              <div>
                <strong className="font-semibold block mb-0.5">
                  Local Sandbox Mode
                </strong>
                <span>
                  Set Auth0 keys in your `.env.local` to enable live cloud
                  authentication.
                </span>
              </div>
            </div>
          )}

          <div className="text-center sm:text-left mb-6">
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
              Sign up
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-zinc-600"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                className={`w-full h-11 px-3.5 rounded-xl border ${
                  errorMsg
                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                    : "border-zinc-300 focus:ring-primary/20 focus:border-primary"
                } bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 transition-all`}
              />
              {errorMsg && (
                <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 mt-1">
                  <Info className="size-3 shrink-0" />
                  {errorMsg}
                </p>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-500">
              By continuing, you agree to our{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Self Service PSS
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline font-medium">
                Privacy Policy
              </a>
              .
            </p>

            <button
              type="submit"
              className="w-full h-11 bg-[rgb(59,89,236)] hover:bg-[rgb(48,74,204)] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Continue
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative flex py-5 items-center">
            <div className="grow border-t border-zinc-200" />
            <span className="shrink mx-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              OR
            </span>
            <div className="grow border-t border-zinc-200" />
          </div>

          {/* Social Sign Up Options */}
          <div className="space-y-2.5">
            {/* GitHub */}
            <button
              type="button"
              onClick={() => handleSocialLogin("github")}
              className="w-full h-11 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl px-4 flex items-center justify-center gap-3 text-sm font-semibold text-zinc-700 transition-colors shadow-2xs cursor-pointer"
            >
              {/* GitHub SVG */}
              <svg
                className="size-5 shrink-0 text-zinc-800 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Continue with GitHub</span>
            </button>

            {/* Google */}
            <button
              type="button"
              onClick={() => handleSocialLogin("google-oauth2")}
              className="w-full h-11 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl px-4 flex items-center justify-center gap-3 text-sm font-semibold text-zinc-700 transition-colors shadow-2xs cursor-pointer"
            >
              {/* Google SVG */}
              <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.81c2.23-2.06 3.64-5.1 3.64-8.46z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.81-3c-1.06.72-2.42 1.16-4.12 1.16-3.18 0-5.86-2.15-6.82-5.04H1.21v3.12C3.18 20.25 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.18 14.21A7.18 7.18 0 0 1 5.18 9.8V6.68H1.21a11.94 11.94 0 0 0 0 10.64l3.97-3.11z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.33 0 3.18 3.75 1.21 7.68l3.97 3.11c.96-2.89 3.64-5.04 6.82-5.04z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Microsoft */}
            <button
              type="button"
              onClick={() => handleSocialLogin("microsoft")}
              className="w-full h-11 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl px-4 flex items-center justify-center gap-3 text-sm font-semibold text-zinc-700 transition-colors shadow-2xs cursor-pointer"
            >
              {/* Microsoft SVG */}
              <svg className="size-4 shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M0 0h11v11H0z" />
                <path fill="#81bc06" d="M12 0h11v11H12z" />
                <path fill="#05a6f0" d="M0 12h11v11H0z" />
                <path fill="#ffba08" d="M12 12h11v11H12z" />
              </svg>
              <span>Continue with Microsoft</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
