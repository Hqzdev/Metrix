import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LaptopIcon,
  DoorOpenIcon,
  MeetingRoomIcon,
  DeskIcon,
  ArrowRight01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

const workspaces = [
  {
    icon: LaptopIcon,
    color: "#6366F1",
    ringColor: "ring-indigo-100",
    iconBgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    labelClass: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:ring-indigo-900/50",
    ctaClass: "text-indigo-600 hover:text-indigo-800",
    tickColor: "#6366F1",
    label: "Drop-in",
    title: "Hot Desk",
    price: "₽800",
    period: "/day",
    description: "Drop into any open-floor desk across our network. Pay only for the days you actually show up.",
    features: [
      "High-speed wifi + monitor on request",
      "Book by the hour or full day",
      "Access to 12 Moscow locations",
    ],
    cta: "Book a desk",
    href: "/booking",
  },
  {
    icon: DoorOpenIcon,
    color: "#10B981",
    ringColor: "ring-emerald-100",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    labelClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900/50",
    ctaClass: "text-emerald-600 hover:text-emerald-800",
    tickColor: "#10B981",
    label: "1–6 people",
    title: "Private Office",
    price: "₽3,500",
    period: "/day",
    description: "A lockable room that's entirely yours. Perfect for sensitive calls, deep work, or small-team sprints.",
    features: [
      "Lockable door — your space, your rules",
      "Dedicated high-speed connection",
      "Reception & client-ready entrance",
    ],
    cta: "Book an office",
    href: "/booking",
  },
  {
    icon: MeetingRoomIcon,
    color: "#F59E0B",
    ringColor: "ring-amber-100",
    iconBgClass: "bg-amber-50 dark:bg-amber-950/40",
    labelClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:ring-amber-900/50",
    ctaClass: "text-amber-600 hover:text-amber-800",
    tickColor: "#F59E0B",
    label: "TV + whiteboard",
    title: "Meeting Room",
    price: "₽1,200",
    period: "/hour",
    description: "Book exactly the time you need — not the full day. Works for client presentations, standups, and sprints.",
    features: [
      "4K TV + magnetic whiteboard",
      "Up to 12 people per room",
      "Instant booking via Telegram",
    ],
    cta: "Reserve a room",
    href: "/booking",
  },
  {
    icon: DeskIcon,
    color: "#8B5CF6",
    ringColor: "ring-violet-100",
    iconBgClass: "bg-violet-50 dark:bg-violet-950/40",
    labelClass: "bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:ring-violet-900/50",
    ctaClass: "text-violet-600 hover:text-violet-800",
    tickColor: "#8B5CF6",
    label: "Monthly plan",
    title: "Dedicated Desk",
    price: "₽12,000",
    period: "/month",
    description: "The same desk, every day. Leave your monitor, your keyboard — come back tomorrow and it's still yours.",
    features: [
      "Reserved spot — your gear stays safe",
      "Cross-location access included",
      "Saves 32% vs daily drop-in",
    ],
    cta: "See memberships",
    href: "/memberships",
  },
];

export function FeaturedProductsSection() {
  return (
    <section id="product" className="bg-[#FAFAFA] dark:bg-zinc-950 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">

        <div data-reveal className="mb-14 text-center">
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-white md:text-5xl">
            What you can book
          </h2>
          <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
            Every workspace type, available on demand.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {workspaces.map((ws, i) => (
            <div
              key={ws.title}
              data-reveal="scale"
              data-delay={String(i * 80)}
              className="group flex flex-col rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-zinc-800/80 dark:border-zinc-700/50"
            >
              {/* Icon + label row */}
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${ws.iconBgClass}`}
                >
                  <HugeiconsIcon
                    icon={ws.icon}
                    size={24}
                    strokeWidth={1.75}
                    color={ws.color}
                  />
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ws.labelClass}`}>
                  {ws.label}
                </span>
              </div>

              {/* Title + price */}
              <div className="mt-5 flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">{ws.title}</h3>
                <div className="flex shrink-0 items-baseline gap-0.5">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{ws.price}</span>
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">{ws.period}</span>
                </div>
              </div>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{ws.description}</p>

              {/* Divider */}
              <div className="my-5 border-t border-zinc-100 dark:border-zinc-700/50" />

              {/* Features */}
              <ul className="flex flex-col gap-2.5">
                {ws.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        size={15}
                        strokeWidth={2}
                        color={ws.tickColor}
                      />
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-7">
                <Link
                  href={ws.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all ${ws.ctaClass}`}
                >
                  {ws.cta}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={15}
                    strokeWidth={2.5}
                    color="currentColor"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
