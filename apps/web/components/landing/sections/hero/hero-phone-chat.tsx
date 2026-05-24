"use client";

import Image from "next/image";
import {
  Clock01Icon,
  Location01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function HeroPhoneChat() {
  return (
    <div className="flex min-h-[296px] flex-col gap-2.5 bg-[#F2F2F7] px-3 py-3 dark:bg-zinc-950">
      <p className="text-center text-[9px] font-medium text-zinc-400">
        Today 9:41 AM
      </p>

      <div className="msg-1 flex items-end gap-1.5">
        <Image
          src="/icons/app-icon-light.png"
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 shrink-0 rounded-full"
        />
        <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm dark:bg-zinc-800">
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-100">
            <HugeiconsIcon
              icon={Location01Icon}
              size={12}
              strokeWidth={2}
              className="text-indigo-500"
            />
            Choose your location:
          </p>
        </div>
      </div>

      <div className="msg-btns ml-7 flex flex-col gap-1">
        {["Arbat", "Patriki", "Novy Arbat"].map((location) => (
          <div
            key={location}
            className={`rounded-xl border px-3 py-1.5 text-center text-[10px] font-medium transition-colors ${
              location === "Patriki"
                ? "border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-200"
                : "border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {location}
          </div>
        ))}
      </div>

      <div className="msg-2 flex justify-end">
        <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-indigo-500 px-3 py-2 shadow-sm">
          <p className="text-[11px] text-white">Patriki</p>
        </div>
      </div>

      <div className="msg-3 flex items-end gap-1.5">
        <Image
          src="/icons/app-icon-light.png"
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 shrink-0 rounded-full"
        />
        <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm dark:bg-zinc-800">
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-100">
            <HugeiconsIcon
              icon={Tick01Icon}
              size={12}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-green-500"
            />
            <span>
              Desk booked for{" "}
              <span className="font-semibold text-zinc-900 dark:text-white">
                10:00–18:00
              </span>
              . See you tomorrow!
            </span>
          </p>
        </div>
      </div>

      <div className="msg-4 flex justify-center pt-1">
        <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1">
          <HugeiconsIcon
            icon={Clock01Icon}
            size={10}
            strokeWidth={2}
            className="text-green-600"
          />
          <span className="text-[9px] font-medium text-green-700">
            Confirmed in 30 seconds
          </span>
        </div>
      </div>
    </div>
  );
}
