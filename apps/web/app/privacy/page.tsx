import { HugeiconsIcon } from "@hugeicons/react";
import {
  ClipboardIcon,
  Search01Icon,
  LockKeyIcon,
  Folder01Icon,
  LegalDocument01Icon,
} from "@hugeicons/core-free-icons";
import { MarketingPageShell } from "@/components/marketing-page-shell";

const sections = [
  {
    icon: ClipboardIcon,
    title: "What we collect",
    body: "We collect your Telegram user ID, booking history, payment confirmations, and location preferences. We do not collect names, email addresses, or phone numbers unless you provide them voluntarily.",
    color: "from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40",
  },
  {
    icon: Search01Icon,
    title: "How we use your data",
    body: "Your data is used to manage workspace access, process bookings, send reminders, and improve the booking experience. We do not use it for advertising.",
    color: "from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40",
  },
  {
    icon: LockKeyIcon,
    title: "Data sharing",
    body: "We do not sell personal data. We share booking confirmations with the relevant location operators only. Payment processing is handled by Telegram Payments — we do not store card details.",
    color: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
  },
  {
    icon: Folder01Icon,
    title: "Data retention",
    body: "Booking records are retained for 12 months for accounting and dispute resolution. You can request deletion of your account and data at any time via @metrix_support.",
    color: "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
  },
  {
    icon: LegalDocument01Icon,
    title: "Your rights",
    body: "You may request access to, correction of, or deletion of your personal data at any time. Contact us at hello@metrix.space or via Telegram.",
    color: "from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40",
  },
];

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Privacy Policy"
      title="We collect only what's needed to run your bookings."
      intro="Last updated May 2026. We keep this short and plain."
    >
      <div className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <div
            key={s.title}
            data-reveal
            data-delay={String(i * 70)}
            className={`rounded-2xl bg-gradient-to-br ${s.color} border border-zinc-100 dark:border-zinc-700/50 p-7 transition-shadow hover:shadow-md`}
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
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  );
}
