"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/theme-toggle";

const headerShadow =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] -translate-x-1/2 md:top-4 md:w-[94%] md:max-w-5xl">
      <div
        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-full bg-white/80 px-3 py-2 pl-4 backdrop-blur-md transition-colors duration-300 md:gap-8 md:pl-5 dark:bg-zinc-900/80"
        style={{ boxShadow: headerShadow }}
      >
        {/* Logo + status badge */}
        <Link href="#hero" className="flex items-center gap-2.5 shrink-0">
          <div className="relative h-7 w-7 shrink-0">
            <Image
              src="/icons/app-icon-light.png"
              alt="Metrix"
              width={28}
              height={28}
              className="rounded-lg dark:hidden"
              priority
            />
            <Image
              src="/icons/app-icon-dark.png"
              alt="Metrix"
              width={28}
              height={28}
              className="hidden rounded-lg dark:block"
              priority
            />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Metrix</span>
          <span className="hidden items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 pulse-dot" />
            99.9% uptime
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center justify-center gap-8 md:flex">
          {["Product", "Pricing", "Changelog", "Docs"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400"
          >
            Sign in
          </Link>
          <Link
            href="/booking"
            className="rounded-full bg-[#6366F1] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
          >
            Start for free
          </Link>
        </div>

        {/* Mobile: theme toggle + menu toggle */}
        <div className="flex items-center gap-1 justify-self-end md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <HugeiconsIcon
              icon={isMenuOpen ? Cancel01Icon : Menu01Icon}
              size={20}
              strokeWidth={1.75}
              color="currentColor"
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] grid overflow-hidden rounded-[28px] bg-white/90 backdrop-blur-md transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden dark:bg-zinc-900/90 ${
          isMenuOpen
            ? "pointer-events-auto grid-rows-[1fr] translate-y-0 opacity-100"
            : "pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0"
        }`}
        style={{ boxShadow: headerShadow }}
        aria-hidden={!isMenuOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <nav className="flex w-full flex-col px-6 py-6 gap-1">
            {["Product", "Pricing", "Changelog", "Docs"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="border-b border-zinc-100 py-4 text-xl font-medium text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/login"
                className="rounded-full border border-zinc-200 px-5 py-3 text-center text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/booking"
                className="rounded-full bg-[#6366F1] px-5 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                Start for free
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
