"use client";

import Link from "next/link";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const avatars = [
  { initials: "AK", color: "bg-indigo-500" },
  { initials: "MP", color: "bg-violet-500" },
  { initials: "DV", color: "bg-pink-500" },
  { initials: "ES", color: "bg-amber-500" },
];

export function HeroCopy() {
  return (
    <div className="flex flex-col gap-7">
      <div className="hero-enter inline-flex">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/40">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Now in public beta →
        </span>
      </div>

      <h1 className="hero-enter hero-enter-2 text-[3.25rem] font-bold leading-[1.08] tracking-[-0.03em] text-zinc-900 dark:text-white md:text-[4rem] lg:text-[4.5rem]">
        Book a desk. <span className="gradient-text">Show up.</span>
        <br />
        Get to work.
      </h1>

      <p className="hero-enter hero-enter-3 max-w-md text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
        Metrix is the fastest way to book coworking space — hot desks, private
        offices, and meeting rooms, available on your schedule via Telegram.
      </p>

      <div className="hero-enter hero-enter-4 flex flex-wrap items-center gap-4">
        <Link
          href="/booking"
          className="pulse-cta group relative overflow-hidden rounded-full bg-[#6366F1] px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#4338CA] active:scale-[0.98]"
        >
          <span className="relative z-10">Get started free</span>
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </Link>
        <button
          type="button"
          className="flex items-center gap-2.5 text-base font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800">
            <HugeiconsIcon icon={PlayIcon} size={13} color="currentColor" />
          </span>
          See how it works
        </button>
      </div>

      <div className="hero-enter hero-enter-5 flex items-center gap-3">
        <div className="flex -space-x-2">
          {avatars.map(({ initials, color }) => (
            <div
              key={initials}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white ${color}`}
            >
              {initials}
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Trusted by{" "}
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            500+
          </span>{" "}
          freelancers and teams
        </p>
      </div>
    </div>
  );
}
