import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiIdeaIcon,
  Building03Icon,
  FlashIcon,
  GlobeIcon,
} from "@hugeicons/core-free-icons";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const beliefs = [
  {
    icon: AiIdeaIcon,
    title: "What we believe",
    body: "Great workspaces should be flexible without feeling temporary. Fast booking, clear availability, and the confidence that the space will be ready when clients arrive.",
    color: "from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
  },
  {
    icon: Building03Icon,
    title: "What we operate",
    body: "Hot desks, dedicated desks, private offices, meeting rooms, and quiet focus zones — across locations in Moscow built for freelancers and modern teams.",
    color: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  {
    icon: FlashIcon,
    title: "How we book",
    body: "Everything runs through Telegram. No app install, no account — just a bot that shows live availability, takes payment, and confirms in under 30 seconds.",
    color: "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  {
    icon: GlobeIcon,
    title: "Where we're going",
    body: "We're expanding our network of locations across Moscow and plan to add new cities in 2026. Currently in public beta — pricing is locked for early members.",
    color: "from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
  },
];

const stats = [
  { value: "500+", label: "Bookings per month" },
  { value: "12", label: "Locations in Moscow" },
  { value: "30s", label: "Average book time" },
  { value: "99.9%", label: "Uptime" },
];

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow="About Metrix"
      title="Coworking that works on your schedule, not ours."
      intro="Metrix was built so that booking a desk feels as fast as sending a message. No friction, no commitment — just a workspace ready when you are."
    >
      {/* Stats strip */}
      <div
        data-reveal
        className="mb-12 grid grid-cols-2 gap-4 rounded-2xl bg-zinc-900 p-8 md:grid-cols-4"
      >
        {stats.map((s) => (
          <div key={s.value} className="text-center">
            <p className="text-3xl font-bold tracking-tight text-white">{s.value}</p>
            <p className="mt-1 text-xs text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Belief cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {beliefs.map((b, i) => (
          <div
            key={b.title}
            data-reveal="scale"
            data-delay={String(i * 80)}
            className={`rounded-2xl bg-gradient-to-br ${b.color} border border-zinc-100 dark:border-zinc-700/50 p-8 transition-shadow hover:shadow-lg`}
          >
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${b.iconBg} text-indigo-600 dark:text-indigo-300`}>
              <HugeiconsIcon icon={b.icon} size={22} strokeWidth={1.75} />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{b.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">{b.body}</p>
          </div>
        ))}
      </div>

      {/* Mission callout */}
      <div
        data-reveal
        className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-10 text-center dark:border-indigo-900/50 dark:bg-indigo-950/40"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Our mission</p>
        <p className="mx-auto mt-4 max-w-2xl text-2xl font-bold leading-snug tracking-tight text-zinc-900 dark:text-white">
          "Make booking a workspace as fast and frictionless as sending a Telegram message."
        </p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">— Metrix Team, 2026</p>
      </div>
    </MarketingPageShell>
  );
}
