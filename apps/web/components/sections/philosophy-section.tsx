import { HugeiconsIcon } from "@hugeicons/react";
import {
  Location01Icon,
  Calendar03Icon,
  Tick01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const steps = [
  {
    badge: "01",
    icon: Location01Icon,
    title: "Pick your spot",
    body: "Browse live desk and room availability across all Metrix locations. See what's open right now.",
  },
  {
    badge: "02",
    icon: Calendar03Icon,
    title: "Choose your time",
    body: "Hourly or full-day. Lock in a desk for a focused session or an office for the whole week.",
  },
  {
    badge: "03",
    icon: Tick01Icon,
    title: "Pay and show up",
    body: "Pay instantly via Telegram Payments. Get a confirmation and walk in. No check-in desk needed.",
  },
];

export function PhilosophySection() {
  return (
    <section id="how-it-works" className="bg-white dark:bg-zinc-900 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
        <div data-reveal className="mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-white md:text-5xl">
            Three taps to a booked desk
          </h2>
          <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
            No accounts, no credit cards, no friction. Just Telegram.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.badge}
              data-reveal
              data-delay={String(i * 100)}
              className="relative rounded-2xl bg-white p-8 glow-border transition-shadow hover:shadow-lg dark:bg-zinc-800 dark:border-zinc-700/50"
            >
              <span className="mb-6 inline-block text-xs font-bold tracking-widest text-indigo-400 uppercase">
                {step.badge}
              </span>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                <HugeiconsIcon icon={step.icon} size={24} strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.body}</p>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:flex">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-sm text-indigo-400">
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
