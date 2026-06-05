"use client";

import { useEffect } from "react";

/**
 * Patches window.fetch globally to include the ngrok-skip-browser-warning
 * header on every request. This bypasses the ngrok browser interstitial
 * warning page that blocks API calls during local tunnel testing.
 *
 * Safe to ship — the header is ignored by non-ngrok servers.
 */
export function NgrokFetchPatch() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const _originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has("ngrok-skip-browser-warning")) {
        headers.set("ngrok-skip-browser-warning", "true");
      }
      return _originalFetch(input, { ...init, headers });
    };
  }, []);

  return null;
}
