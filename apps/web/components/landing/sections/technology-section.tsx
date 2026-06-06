import React from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const slots = ["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

type SlotState = "available" | "booked" | "mine";

const slotGrid: Record<string, SlotState> = {
  "Mon-9:00": "booked",  "Mon-10:00": "available", "Mon-11:00": "available", "Mon-12:00": "booked",
  "Mon-13:00": "available", "Mon-14:00": "mine", "Mon-15:00": "mine", "Mon-16:00": "available",
  "Tue-9:00": "available", "Tue-10:00": "booked", "Tue-11:00": "mine", "Tue-12:00": "mine",
  "Tue-13:00": "available", "Tue-14:00": "booked", "Tue-15:00": "available", "Tue-16:00": "available",
  "Wed-9:00": "booked", "Wed-10:00": "booked", "Wed-11:00": "available", "Wed-12:00": "available",
  "Wed-13:00": "booked", "Wed-14:00": "available", "Wed-15:00": "available", "Wed-16:00": "booked",
  "Thu-9:00": "available", "Thu-10:00": "available", "Thu-11:00": "booked", "Thu-12:00": "available",
  "Thu-13:00": "available", "Thu-14:00": "booked", "Thu-15:00": "booked", "Thu-16:00": "available",
  "Fri-9:00": "mine", "Fri-10:00": "mine", "Fri-11:00": "mine", "Fri-12:00": "available",
  "Fri-13:00": "available", "Fri-14:00": "available", "Fri-15:00": "booked", "Fri-16:00": "available",
};

const slotColors: Record<SlotState, string> = {
  available: "bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800/40",
  booked: "bg-zinc-100 border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600",
  mine: "bg-indigo-500 border-indigo-600",
};

const features = [
  "Live availability updated every 60 seconds",
  "Instant payment confirmation via Telegram Payments",
  "Automatic reminders 15 min before your booking",
  "Works on any device — no app install required",
];

export function TechnologySection() {
  return (
    <section id="availability" className="bg-[#FAFAFA] dark:bg-zinc-950 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">

          <div data-reveal="left">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Real-time booking
            </p>
            <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-zinc-900 dark:text-white md:text-5xl">
              Always know what&apos;s open before you leave home.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
              Metrix syncs desk and room availability in real time. No stale calendars, no double-bookings. What you see in the bot is what&apos;s actually free.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal="right" className="flex justify-center">
            <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-5 mockup-shadow dark:border-zinc-700/50 dark:bg-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Desk Availability — This Week</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 pulse-dot" />
                  <span className="text-xs font-medium text-green-600">Live</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div
                  className="grid gap-1 text-center"
                  style={{ gridTemplateColumns: `40px repeat(${days.length}, 1fr)` }}
                >
                  <div />
                  {days.map((d) => (
                    <div key={d} className="pb-1 text-xs font-medium text-zinc-400 dark:text-zinc-500">{d}</div>
                  ))}
                  {slots.map((slot) => (
                    <React.Fragment key={slot}>
                      <div className="flex items-center text-[10px] text-zinc-400 dark:text-zinc-500">{slot}</div>
                      {days.map((day) => {
                        const state: SlotState = slotGrid[`${day}-${slot}`] ?? "available";
                        return (
                          <div
                            key={`${day}-${slot}`}
                            className={`h-6 rounded border ${slotColors[state]}`}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-green-100 border border-green-200 dark:bg-green-900/30 dark:border-green-800/40" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-zinc-100 border border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600" /> Booked
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-indigo-500 border border-indigo-600" /> Your booking
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
