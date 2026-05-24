import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { FooterSection } from "@/components/sections/footer-section";
import { ThemeToggle } from "@/components/theme-toggle";

type MarketingPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

const headerShadow =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px";

const navLinks = [
  { label: "Product", href: "/#product" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Locations", href: "/locations" },
  { label: "Docs", href: "/faq" },
];

export function MarketingPageShell({
  eyebrow,
  title,
  intro,
  children,
}: MarketingPageShellProps) {
  return (
    <main className="min-h-screen bg-background font-sans text-foreground">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90" style={{ boxShadow: headerShadow }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-7 w-7 shrink-0">
              <Image
                src="/logo-light.png"
                alt="Metrix"
                width={28}
                height={28}
                className="rounded-lg dark:hidden"
                priority
              />
              <Image
                src="/logo-dark.png"
                alt="Metrix"
                width={28}
                height={28}
                className="hidden rounded-lg dark:block"
                priority
              />
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">Metrix</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/booking"
              className="rounded-full bg-[#6366F1] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA]"
            >
              Start for free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page hero ── */}
      <section className="relative overflow-hidden border-b border-zinc-100 bg-background px-6 pb-16 pt-20 md:px-12 md:pb-20 md:pt-28 lg:px-20 dark:border-zinc-800">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-indigo-100/50 dark:bg-indigo-900/15 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <p className="hero-enter text-xs font-semibold uppercase tracking-widest text-indigo-500">
            {eyebrow}
          </p>
          <h1 className="hero-enter hero-enter-2 mt-5 max-w-4xl text-4xl font-bold leading-[1.1] tracking-[-0.03em] text-zinc-900 dark:text-white md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="hero-enter hero-enter-3 mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400 md:text-xl">
            {intro}
          </p>
        </div>
      </section>

      {/* ── Page content ── */}
      <section className="px-6 py-16 md:px-12 md:py-20 lg:px-20">
        <div className="mx-auto max-w-5xl">{children}</div>
      </section>

      <FooterSection />
    </main>
  );
}
