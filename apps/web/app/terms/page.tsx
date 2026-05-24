import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalendarCheckIn01Icon,
  Tick01Icon,
  Ticket01Icon,
  RefreshIcon,
  Alert01Icon,
  Note01Icon,
} from "@hugeicons/core-free-icons";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const sections = [
  {
    icon: CalendarCheckIn01Icon,
    title: "Booking and cancellation",
    body: "Bookings are confirmed instantly upon payment. Cancellations are allowed up to 1 hour before the booking start time for a full refund. Late cancellations are non-refundable.",
  },
  {
    icon: Tick01Icon,
    title: "Fair use",
    body: "Members may use booked desks, rooms, and offices for professional work only. Subletting, persistent personal storage beyond your plan, and disruptive conduct are not permitted.",
  },
  {
    icon: Ticket01Icon,
    title: "Meeting room credits",
    body: "Monthly meeting room credits expire at the end of each billing cycle and do not carry over. Guest passes are valid for 30 days from issue.",
  },
  {
    icon: RefreshIcon,
    title: "Plan changes",
    body: "You may upgrade or cancel your plan at any time via the Metrix bot. Downgrades take effect at the start of the next billing cycle. No partial refunds for early cancellation.",
  },
  {
    icon: Alert01Icon,
    title: "Liability",
    body: "Metrix is not responsible for lost, stolen, or damaged property left at locations. Members use workspace facilities at their own risk.",
  },
  {
    icon: Note01Icon,
    title: "Changes to these terms",
    body: "We may update these terms with 14 days notice via the bot or email. Continued use of Metrix after that date constitutes acceptance.",
  },
];

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Terms of Service"
      title="Clear rules for booking and membership."
      intro="Last updated May 2026. Questions? Contact us at hello@metrix.space."
    >
      <div className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <div
            key={s.title}
            data-reveal
            data-delay={String(i * 60)}
            className="rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/50 dark:bg-zinc-800"
          >
            <div className="flex items-start gap-4">
              <HugeiconsIcon
                icon={s.icon}
                size={22}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300"
              />
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  );
}
