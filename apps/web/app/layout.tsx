import React from "react";
import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Metrix — Book a workspace from Telegram",
  description:
    "Book hot desks, meeting rooms, private offices, and event spaces directly from Telegram.",
  icons: {
    icon: [
      { url: "/logo-light.png", media: "(prefers-color-scheme: light)", sizes: "any" },
      { url: "/logo-dark.png", media: "(prefers-color-scheme: dark)", sizes: "any" },
    ],
    apple: "/logo-dark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={`${geist.variable} ${spaceGrotesk.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
