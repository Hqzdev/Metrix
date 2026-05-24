"use client";

import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  BatteryFullIcon,
  Clock01Icon,
  Location01Icon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusSignIcon,
  SentIcon,
  SignalFull01Icon,
  TelegramIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

const avatars = [
  { initials: "AK", color: "bg-indigo-500" },
  { initials: "MP", color: "bg-violet-500" },
  { initials: "DV", color: "bg-pink-500" },
  { initials: "ES", color: "bg-amber-500" },
];

export function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden bg-[#FAFAFA] dark:bg-zinc-950 pt-32 pb-20 md:pt-40 md:pb-28">

      {/* Background glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-100/60 dark:bg-indigo-900/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-violet-100/50 dark:bg-violet-900/15 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-pink-100/30 dark:bg-pink-900/10 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* ── Left column: copy ─────────────────────── */}
          <div className="flex flex-col gap-7">

            <div className="hero-enter inline-flex">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/40 px-4 py-1.5 text-sm font-medium text-indigo-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 pulse-dot" />
                Now in public beta →
              </span>
            </div>

            <h1 className="hero-enter hero-enter-2 text-[3.25rem] font-bold leading-[1.08] tracking-[-0.03em] text-zinc-900 dark:text-white md:text-[4rem] lg:text-[4.5rem]">
              Book a desk.{" "}
              <span className="gradient-text">Show up.</span>
              <br />
              Get to work.
            </h1>

            <p className="hero-enter hero-enter-3 max-w-md text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              Metrix is the fastest way to book coworking space — hot desks, private offices, and meeting rooms, available on your schedule via Telegram.
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
                Trusted by <span className="font-medium text-zinc-600 dark:text-zinc-300">500+</span> freelancers and teams
              </p>
            </div>
          </div>

          {/* ── Right column: iPhone mockup ──────────────── */}
          <div className="relative flex items-center justify-center lg:justify-end">

            {/* Soft radial glow behind phone */}
            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/60 dark:bg-indigo-900/20 blur-[90px]" />

            {/* Floating confirmation badge */}
            <div className="animate-float-card absolute -bottom-2 -left-4 z-20 flex items-center gap-3 rounded-2xl border border-green-100 bg-white px-4 py-3 shadow-xl lg:-left-10 lg:bottom-10 dark:border-green-900/40 dark:bg-zinc-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <HugeiconsIcon icon={Tick01Icon} size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">Desk confirmed</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Patriki · 10:00 – 18:00</p>
              </div>
            </div>

            {/* iPhone */}
            <div className="animate-float-phone relative">
            <div
              style={{
                transform: "rotate(7deg)",
                transformOrigin: "center center",
                filter: "drop-shadow(0 60px 80px rgba(0,0,0,0.28)) drop-shadow(0 20px 40px rgba(0,0,0,0.16))",
              }}
            >
              {/* Outer phone frame */}
              <div
                style={{
                  width: 272,
                  background: "linear-gradient(160deg, #2a2a2e 0%, #1a1a1e 60%, #111114 100%)",
                  borderRadius: 54,
                  padding: 10,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.6)",
                  position: "relative",
                }}
              >
                {/* Side volume buttons (decorative) */}
                <div style={{ position: "absolute", left: -3, top: 90, width: 3, height: 30, background: "#2a2a2e", borderRadius: "3px 0 0 3px" }} />
                <div style={{ position: "absolute", left: -3, top: 130, width: 3, height: 50, background: "#2a2a2e", borderRadius: "3px 0 0 3px" }} />
                <div style={{ position: "absolute", left: -3, top: 190, width: 3, height: 50, background: "#2a2a2e", borderRadius: "3px 0 0 3px" }} />
                {/* Power button */}
                <div style={{ position: "absolute", right: -3, top: 130, width: 3, height: 70, background: "#2a2a2e", borderRadius: "0 3px 3px 0" }} />

                {/* Screen */}
                <div
                  className="relative overflow-hidden bg-white dark:bg-zinc-900"
                  style={{ borderRadius: 46 }}
                >
                  {/* Status bar + Dynamic Island */}
                  <div className="relative flex items-center justify-between bg-white px-5 pb-1 pt-3 dark:bg-zinc-900">
                    <span className="z-10 text-[11px] font-semibold text-zinc-900 dark:text-white">9:41</span>
                    {/* Dynamic Island */}
                    <div
                      className="absolute left-1/2 top-0 -translate-x-1/2"
                      style={{
                        width: 110,
                        height: 32,
                        background: "#111114",
                        borderRadius: "0 0 20px 20px",
                      }}
                    />
                    <div className="z-10 flex items-center gap-[3px]">
                      <HugeiconsIcon icon={SignalFull01Icon} size={13} strokeWidth={2} className="text-zinc-900 dark:text-white" />
                      <HugeiconsIcon icon={BatteryFullIcon} size={13} strokeWidth={2} className="text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  {/* Chat header */}
                  <div className="flex items-center gap-2 border-b border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} className="ml-0.5 text-indigo-500" />
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600">
                      <HugeiconsIcon icon={TelegramIcon} size={15} strokeWidth={1.75} className="text-white" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-zinc-900 dark:text-white">Metrix Bot</p>
                      <p className="text-[9px] text-green-500 font-medium">online</p>
                    </div>
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={16} strokeWidth={2} className="text-zinc-400" />
                  </div>

                  {/* Chat body */}
                  <div className="flex min-h-[296px] flex-col gap-2.5 bg-[#F2F2F7] px-3 py-3 dark:bg-zinc-950">

                    {/* Timestamp */}
                    <p className="text-center text-[9px] font-medium text-zinc-400">Today 9:41 AM</p>

                    {/* Bot message */}
                    <div className="msg-1 flex items-end gap-1.5">
                      <Image src="/icons/app-icon-light.png" alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded-full" />
                      <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm dark:bg-zinc-800">
                        <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                          <HugeiconsIcon icon={Location01Icon} size={12} strokeWidth={2} className="text-indigo-500" />
                          Choose your location:
                        </p>
                      </div>
                    </div>

                    {/* Location buttons */}
                    <div className="msg-btns ml-7 flex flex-col gap-1">
                      {["Arbat", "Patriki", "Novy Arbat"].map((loc) => (
                        <div
                          key={loc}
                          className={`rounded-xl border px-3 py-1.5 text-center text-[10px] font-medium transition-colors ${
                            loc === "Patriki"
                              ? "border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                              : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {loc}
                        </div>
                      ))}
                    </div>

                    {/* User reply */}
                    <div className="msg-2 flex justify-end">
                      <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-indigo-500 px-3 py-2 shadow-sm">
                        <p className="text-[11px] text-white">Patriki</p>
                      </div>
                    </div>

                    {/* Bot confirmation */}
                    <div className="msg-3 flex items-end gap-1.5">
                      <Image src="/icons/app-icon-light.png" alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded-full" />
                      <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm dark:bg-zinc-800">
                        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-100">
                          <HugeiconsIcon icon={Tick01Icon} size={12} strokeWidth={2} className="mt-0.5 shrink-0 text-green-500" />
                          <span>Desk booked for{" "}
                          <span className="font-semibold text-zinc-900 dark:text-white">10:00–18:00</span>.
                          {" "}See you tomorrow!</span>
                        </p>
                      </div>
                    </div>

                    {/* Speed confirmation */}
                    <div className="msg-4 flex justify-center pt-1">
                      <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1">
                        <HugeiconsIcon icon={Clock01Icon} size={10} strokeWidth={2} className="text-green-600" />
                        <span className="text-[9px] font-medium text-green-700">Confirmed in 30 seconds</span>
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="flex items-center gap-2 border-t border-zinc-200/60 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-base font-light text-zinc-400 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                      <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={2} />
                    </div>
                    <div className="flex-1 rounded-full bg-[#F2F2F7] px-3 py-1.5 dark:bg-zinc-800">
                      <span className="text-[10px] text-zinc-400">Message</span>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111114] shadow-sm">
                      <HugeiconsIcon icon={SentIcon} size={12} strokeWidth={2} className="text-white" />
                    </div>
                  </div>

                  {/* Home bar */}
                  <div className="flex justify-center bg-white pb-2 pt-1.5 dark:bg-zinc-900">
                    <div className="h-[4px] w-28 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
