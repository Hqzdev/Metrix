import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { TelegramIcon } from "@hugeicons/core-free-icons";

export function EditorialSection() {
  return (
    <section className="bg-indigo-600 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-12">
        <div data-reveal className="flex flex-col items-center gap-6">
          <HugeiconsIcon icon={TelegramIcon} size={48} strokeWidth={1.75} className="tg-icon text-white" />
          <h2 className="text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-white md:text-5xl">
            Lives where your team already is.
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-indigo-200">
            No new app to download. No new account to create. Metrix is a Telegram bot — your team uses Telegram, so booking a desk is as easy as sending a message.
          </p>
          <Link
            href="https://t.me/metrix_bot"
            className="mt-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            Open in Telegram →
          </Link>
        </div>
      </div>
    </section>
  );
}
