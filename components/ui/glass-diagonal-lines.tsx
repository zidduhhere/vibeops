"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface GlassDiagonalLinesProps {
  direction?: "left-to-right" | "right-to-left";
  variant?: "primary" | "light";
  className?: string;
}

export function GlassDiagonalLines({
  direction = "left-to-right",
  variant = "primary",
  className,
}: GlassDiagonalLinesProps) {
  const isLtr = direction === "left-to-right";
  const isPrimary = variant === "primary";

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden select-none -z-10",
        className,
      )}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Base line paths:
            Left-to-Right: (0,0) to (100%, 100%)
            Right-to-Left: (100%, 0) to (0, 100%)
        */}
        <g className="opacity-100">
          {/* STRIPE 1 (Left / Top-Left offset) */}
          {/* Thick glass fill */}
          <line
            x1={isLtr ? "0" : "100%"}
            y1="0"
            x2={isLtr ? "100%" : "0"}
            y2="100%"
            transform="translate(-40, 0)"
            className={cn(
              "[stroke-width:48px]",
              isPrimary
                ? "stroke-primary opacity-[0.08] dark:opacity-[0.05]"
                : "stroke-white opacity-[0.06]",
            )}
          />
          {/* Inner glass reflection (thin bright line) */}
          <line
            x1={isLtr ? "0" : "100%"}
            y1="0"
            x2={isLtr ? "100%" : "0"}
            y2="100%"
            transform="translate(-64, 0)"
            className={cn(
              "[stroke-width:1px]",
              isPrimary
                ? "stroke-primary/20 dark:stroke-white/20"
                : "stroke-white/30",
            )}
          />
          <line
            x1={isLtr ? "0" : "100%"}
            y1="0"
            x2={isLtr ? "100%" : "0"}
            y2="100%"
            transform="translate(-16, 0)"
            className={cn(
              "[stroke-width:1px]",
              isPrimary
                ? "stroke-primary/20 dark:stroke-white/20"
                : "stroke-white/30",
            )}
          />

          {/* STRIPE 2 (Right / Bottom-Right offset) */}
          {/* Thick glass fill */}
          <line
            x1={isLtr ? "0" : "100%"}
            y1="0"
            x2={isLtr ? "100%" : "0"}
            y2="100%"
            transform="translate(40, 0)"
            className={cn(
              "[stroke-width:48px]",
              isPrimary
                ? "stroke-primary opacity-[0.08] dark:opacity-[0.05]"
                : "stroke-white opacity-[0.06]",
            )}
          />
          {/* Inner glass reflection (thin bright line) */}
          <line
            x1={isLtr ? "0" : "100%"}
            y1="0"
            x2={isLtr ? "100%" : "0"}
            y2="100%"
            transform="translate(16, 0)"
            className={cn(
              "[stroke-width:1px]",
              isPrimary
                ? "stroke-primary/20 dark:stroke-white/20"
                : "stroke-white/30",
            )}
          />
          <line
            x1={isLtr ? "0" : "100%"}
            y1="0"
            x2={isLtr ? "100%" : "0"}
            y2="100%"
            transform="translate(64, 0)"
            className={cn(
              "[stroke-width:1px]",
              isPrimary
                ? "stroke-primary/20 dark:stroke-white/20"
                : "stroke-white/30",
            )}
          />
        </g>
      </svg>
    </div>
  );
}
