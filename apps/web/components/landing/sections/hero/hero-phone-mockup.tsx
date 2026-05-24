"use client";

import {
  ArrowLeft01Icon,
  BatteryFullIcon,
  MoreHorizontalIcon,
  PlusSignIcon,
  SentIcon,
  SignalFull01Icon,
  TelegramIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { HeroPhoneChat } from "./hero-phone-chat";

export function HeroPhoneMockup() {
  return (
    <div className="relative flex items-center justify-center lg:justify-end">
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/60 blur-[90px] dark:bg-indigo-900/20" />

      <div className="animate-float-card absolute -bottom-2 -left-4 z-20 flex items-center gap-3 rounded-2xl border border-green-100 bg-white px-4 py-3 shadow-xl dark:border-green-900/40 dark:bg-zinc-800 lg:-left-10 lg:bottom-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-600">
          <HugeiconsIcon icon={Tick01Icon} size={18} strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-900 dark:text-white">
            Desk confirmed
          </p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Patriki · 10:00 – 18:00
          </p>
        </div>
      </div>

      <div className="animate-float-phone relative">
        <div
          style={{
            transform: "rotate(7deg)",
            transformOrigin: "center center",
            filter:
              "drop-shadow(0 60px 80px rgba(0,0,0,0.28)) drop-shadow(0 20px 40px rgba(0,0,0,0.16))",
          }}
        >
          <div
            style={{
              width: 272,
              background:
                "linear-gradient(160deg, #2a2a2e 0%, #1a1a1e 60%, #111114 100%)",
              borderRadius: 54,
              padding: 10,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.6)",
              position: "relative",
            }}
          >
            <div style={phoneButtonStyle(90, 30, "left")} />
            <div style={phoneButtonStyle(130, 50, "left")} />
            <div style={phoneButtonStyle(190, 50, "left")} />
            <div style={phoneButtonStyle(130, 70, "right")} />

            <div
              className="relative overflow-hidden bg-white dark:bg-zinc-900"
              style={{ borderRadius: 46 }}
            >
              <HeroStatusBar />
              <HeroChatHeader />
              <HeroPhoneChat />
              <HeroInputBar />
              <div className="flex justify-center bg-white pb-2 pt-1.5 dark:bg-zinc-900">
                <div className="h-[4px] w-28 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStatusBar() {
  return (
    <div className="relative flex items-center justify-between bg-white px-5 pb-1 pt-3 dark:bg-zinc-900">
      <span className="z-10 text-[11px] font-semibold text-zinc-900 dark:text-white">
        9:41
      </span>
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
  );
}

function HeroChatHeader() {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} className="ml-0.5 text-indigo-500" />
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600">
        <HugeiconsIcon icon={TelegramIcon} size={15} strokeWidth={1.75} className="text-white" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
      </div>
      <div className="flex-1">
        <p className="text-[12px] font-semibold text-zinc-900 dark:text-white">
          Metrix Bot
        </p>
        <p className="text-[9px] font-medium text-green-500">online</p>
      </div>
      <HugeiconsIcon icon={MoreHorizontalIcon} size={16} strokeWidth={2} className="text-zinc-400" />
    </div>
  );
}

function HeroInputBar() {
  return (
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
  );
}

function phoneButtonStyle(top: number, height: number, side: "left" | "right") {
  return {
    position: "absolute" as const,
    [side]: -3,
    top,
    width: 3,
    height,
    background: "#2a2a2e",
    borderRadius: side === "left" ? "3px 0 0 3px" : "0 3px 3px 0",
  };
}
