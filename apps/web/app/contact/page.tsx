import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, TelegramIcon } from "@hugeicons/core-free-icons";
import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact"
      title="Get in touch."
      intro="Questions about plans, locations, or enterprise pricing? We typically respond within a few hours."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div
          data-reveal="scale"
          data-delay="0"
          className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/50 dark:bg-zinc-800"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
            <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={1.75} className="text-indigo-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Email</p>
          <p className="mt-3 text-xl font-semibold text-zinc-900 dark:text-white">hello@metrix.space</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">For memberships, invoicing, and enterprise enquiries.</p>
        </div>

        <div
          data-reveal="scale"
          data-delay="80"
          className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/50 dark:bg-zinc-800"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
            <HugeiconsIcon icon={TelegramIcon} size={18} strokeWidth={1.75} className="text-indigo-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Telegram</p>
          <p className="mt-3 text-xl font-semibold text-zinc-900 dark:text-white">@metrix_support</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Fastest response — usually within an hour.</p>
        </div>

        <div
          data-reveal
          data-delay="160"
          className="rounded-2xl border border-indigo-100 bg-indigo-50 p-8 md:col-span-2 dark:border-indigo-900/50 dark:bg-indigo-950/40"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Start for free</p>
          <p className="mt-3 text-lg font-semibold text-zinc-900 dark:text-white">
            Ready to book a desk without a sales call?
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Open the Telegram bot, choose a location, and lock in a workspace in under 30 seconds.
          </p>
          <Link
            href="https://t.me/metrix_bot"
            className="mt-5 inline-block rounded-full bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
          >
            Open in Telegram →
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
