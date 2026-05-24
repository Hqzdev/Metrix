"use client";

import { HeroCopy } from "./hero/hero-copy";
import { HeroPhoneMockup } from "./hero/hero-phone-mockup";

export function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden bg-[#FAFAFA] dark:bg-zinc-950 pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-100/60 dark:bg-indigo-900/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-violet-100/50 dark:bg-violet-900/15 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-pink-100/30 dark:bg-pink-900/10 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <HeroCopy />
          <HeroPhoneMockup />
        </div>
      </div>
    </section>
  );
}
