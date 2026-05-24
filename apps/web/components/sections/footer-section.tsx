import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { TelegramIcon } from "@hugeicons/core-free-icons";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Status", href: "/status" },
];

export function FooterSection() {
  return (
    <footer className="bg-[#FAFAFA] dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
      {/* CTA strip */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 py-16 text-center">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-zinc-900 dark:text-white md:text-4xl">
          Ready to book your desk?
        </h2>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">Start for free. No credit card required.</p>
        <Link
          href="/booking"
          className="mt-6 inline-block rounded-full bg-[#6366F1] px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-[#4338CA]"
        >
          Start for free
        </Link>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-20">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative h-7 w-7 shrink-0">
              <Image
                src="/logo-light.png"
                alt="Metrix"
                width={28}
                height={28}
                className="rounded-lg dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt="Metrix"
                width={28}
                height={28}
                className="hidden rounded-lg dark:block"
              />
            </div>
            <span className="text-base font-bold text-zinc-900 dark:text-white">Metrix</span>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-5 md:px-12 lg:px-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            © 2026 Metrix. Made for freelancers and teams.
          </p>
          <Link
            href="https://t.me/metrix_bot"
            className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-indigo-600 dark:text-zinc-500"
          >
            <HugeiconsIcon icon={TelegramIcon} size={18} strokeWidth={1.75} />
            Open in Telegram
          </Link>
        </div>
      </div>
    </footer>
  );
}
