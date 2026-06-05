/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { NgrokFetchPatch } from "@/components/ngrok-fetch-patch";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeOps",
  description:
    "AI client communication command center for solo developers and small studios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-full flex flex-col">
        <NgrokFetchPatch />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
