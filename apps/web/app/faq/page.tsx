import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const faqs = [
  {
    q: "Can I book a desk for just one day?",
    a: "Yes. Metrix supports drop-in day passes — no monthly commitment required. Book any open desk in under 30 seconds via Telegram.",
    tag: "Booking",
  },
  {
    q: "How does payment work?",
    a: "Payments are processed directly through Telegram Payments. You pay when you confirm a booking and receive an instant receipt.",
    tag: "Payment",
  },
  {
    q: "Do I need to create an account?",
    a: "No account needed. The Metrix bot identifies you by your Telegram account. Just open the bot and start booking.",
    tag: "Account",
  },
  {
    q: "Can I book private offices for my team?",
    a: "Yes. Private offices for 1–6 people are available at most locations. You can book by the day or on a monthly plan.",
    tag: "Offices",
  },
  {
    q: "Are meeting rooms included in my plan?",
    a: "Meeting rooms can be booked hourly or bundled. Pro and Team plans include meeting room credits. Drop-In members book separately.",
    tag: "Meeting rooms",
  },
  {
    q: "Can I use different locations?",
    a: "Pro and Team plans include cross-location access. You can work at any Metrix location in Moscow on the same membership.",
    tag: "Locations",
  },
  {
    q: "What if I need to cancel a booking?",
    a: "You can cancel up to 1 hour before your booking starts via the bot with a full refund. Late cancellations are non-refundable.",
    tag: "Cancellation",
  },
  {
    q: "Is there a free trial?",
    a: "We're in public beta. Early members get access to locked beta pricing which is significantly lower than future public rates.",
    tag: "Pricing",
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="FAQ"
      title="Questions teams ask before they switch."
      intro="Everything you need to know about booking, payment, plans, and access."
    >
      <div className="flex flex-col gap-4">
        {faqs.map((item, i) => (
          <div
            key={item.q}
            data-reveal
            data-delay={String(i * 60)}
            className="group rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/50 dark:bg-zinc-800"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{item.q}</h2>
              <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/40">
                {item.tag}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{item.a}</p>
          </div>
        ))}
      </div>

      <div data-reveal className="mt-10 rounded-2xl bg-zinc-900 p-8 text-center">
        <p className="text-lg font-semibold text-white">Still have questions?</p>
        <p className="mt-2 text-sm text-zinc-400">
          Reach us on Telegram or email — we typically respond within a few hours.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="https://t.me/metrix_support"
            className="rounded-full bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
          >
            Open Telegram →
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Contact page
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
