import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Explicitly pin the workspace root to THIS project folder.
  // Prevents Turbopack from scanning the parent /web/ directory
  // when it finds stray lockfiles there — which freezes the machine.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Allow the ngrok tunnel as a trusted dev origin
  allowedDevOrigins: ["crepe-easing-founding.ngrok-free.dev"],

  // Add ngrok bypass header to every response so the interstitial warning
  // is skipped automatically when testing via ngrok tunnels.
  // Safe in production — non-ngrok servers ignore this header.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "ngrok-skip-browser-warning", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
