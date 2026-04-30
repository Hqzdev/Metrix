import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { FooterSection } from "@/components/sections/footer-section";

type MarketingPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function MarketingPageShell({
  eyebrow,
  title,
  intro,
  children,
}: MarketingPageShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-3 text-lg font-medium tracking-tight">
            <span className="relative h-8 w-8 overflow-hidden rounded-full border border-border bg-background">
              <Image
                src="/images/icon.png"
                alt="Metrix logo"
                fill
                className="object-cover"
                priority
              />
            </span>
            <span>Metrix</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/booking" className="transition-colors hover:text-foreground">
              Booking
            </Link>
            <Link href="/memberships" className="transition-colors hover:text-foreground">
              Memberships
            </Link>
            <Link href="/locations" className="transition-colors hover:text-foreground">
              Locations
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </div>

      <section className="border-b border-border px-6 pb-14 pt-20 md:px-12 md:pb-20 md:pt-28 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-medium tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
            {intro}
          </p>
        </div>
      </section>

      <section className="px-6 py-14 md:px-12 md:py-20 lg:px-20">
        <div className="mx-auto max-w-5xl">{children}</div>
      </section>

      <FooterSection />
    </main>
  );
}
