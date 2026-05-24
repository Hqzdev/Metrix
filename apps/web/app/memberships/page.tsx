import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import { MarketingPageShell } from "@/components/layout/marketing-page-shell";

const plans = [
  {
    name: "Drop-In",
    price: "₽800",
    period: "/day",
    sub: "No commitment",
    features: [
      "Hot desk access",
      "High-speed wifi",
      "Coffee & tea",
      "Locker access",
      "Telegram bot booking",
    ],
    cta: "Start booking",
    href: "/booking",
    highlighted: false,
  },
  {
    name: "Pro",
    badge: "Most popular",
    price: "₽12,000",
    period: "/month",
    sub: "~₽545/day — save 32%",
    features: [
      "Everything in Drop-In",
      "Dedicated desk",
      "Priority room booking",
      "10h meeting room credits",
      "Guest passes (2/month)",
      "Cross-location access",
    ],
    cta: "Get Pro",
    href: "/booking",
    highlighted: true,
  },
  {
    name: "Team",
    price: "From ₽40,000",
    period: "/month",
    sub: "Up to 5 members",
    features: [
      "Everything in Pro",
      "Private office",
      "Unlimited meeting rooms",
      "Admin dashboard",
      "Custom invoicing",
      "Dedicated account manager",
    ],
    cta: "Contact us",
    href: "/contact",
    highlighted: false,
  },
];

export default function MembershipsPage() {
  return (
    <MarketingPageShell
      eyebrow="Memberships"
      title="Plans that flex with how you work."
      intro="Drop in for a day, lock in a dedicated desk, or get a private office for your team. Every plan books through Telegram in seconds."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            data-reveal="scale"
            data-delay={String(i * 100)}
            className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
              plan.highlighted
                ? "border-indigo-600 bg-[#6366F1] text-white shadow-2xl shadow-indigo-200"
                : "border-zinc-200 bg-white hover:shadow-lg dark:border-zinc-700/50 dark:bg-zinc-800"
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-indigo-100 bg-white px-4 py-1 text-xs font-semibold text-indigo-600 shadow-sm">
                {plan.badge}
              </span>
            )}

            <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-indigo-100" : "text-zinc-500 dark:text-zinc-400"}`}>
              {plan.name}
            </h3>

            <div className="mt-4 flex items-end gap-1">
              <span className={`text-3xl font-bold tracking-tight ${plan.highlighted ? "text-white" : "text-zinc-900 dark:text-white"}`}>
                {plan.price}
              </span>
              <span className={`mb-1 text-sm ${plan.highlighted ? "text-indigo-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                {plan.period}
              </span>
            </div>
            <p className={`mt-1 text-sm ${plan.highlighted ? "text-indigo-200" : "text-zinc-400 dark:text-zinc-500"}`}>
              {plan.sub}
            </p>

            <ul className="mt-6 flex flex-col gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={14}
                    strokeWidth={2}
                    className={`mt-0.5 shrink-0 ${plan.highlighted ? "text-indigo-200" : "text-green-500"}`}
                  />
                  <span className={plan.highlighted ? "text-indigo-50" : "text-zinc-600 dark:text-zinc-300"}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? "bg-white text-indigo-600 hover:bg-indigo-50"
                  : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <p data-reveal className="mt-8 text-center text-sm text-zinc-400">
        All plans include Telegram bot booking. No credit card required to start.
      </p>
    </MarketingPageShell>
  );
}
