"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const headerShadow =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header 
      className="fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] -translate-x-1/2 md:top-4 md:w-[94%] md:max-w-5xl"
    >
      <div
        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-full bg-background/80 px-3 py-2 pl-5 backdrop-blur-md transition-colors duration-300 md:gap-8 md:pl-6"
        style={{ boxShadow: headerShadow }}
      >
        <Link href="#hero" className="flex items-center gap-3 text-lg font-medium tracking-tight transition-colors duration-300 text-foreground">
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

        <nav className="hidden items-center justify-center gap-12 md:flex">
          <Link
            href="/booking"
            className="text-sm transition-colors text-muted-foreground hover:text-foreground"
          >
            Booking
          </Link>
          <Link
            href="#technology"
            className="text-sm transition-colors text-muted-foreground hover:text-foreground"
          >
            Workspace
          </Link>
          <Link
            href="#gallery"
            className="text-sm transition-colors text-muted-foreground hover:text-foreground"
          >
            Locations
          </Link>
          <Link
            href="#accessories"
            className="text-sm transition-colors text-muted-foreground hover:text-foreground"
          >
            Memberships
          </Link>
          <Link
            href="#about"
            className="text-sm transition-colors text-muted-foreground hover:text-foreground"
          >
            Experience
          </Link>
        </nav>

        <div className="hidden items-center justify-end md:flex">
          <Link
            href="/contact"
            className="px-4 py-2 text-sm font-medium transition-all rounded-full bg-foreground text-background hover:opacity-80"
          >
            Book a tour
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full transition-colors text-foreground md:hidden"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] grid overflow-hidden rounded-[28px] bg-background/80 backdrop-blur-md transition-[grid-template-rows,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          isMenuOpen
            ? "pointer-events-auto grid-rows-[1fr] translate-y-0 opacity-100"
            : "pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0"
        }`}
        style={{ boxShadow: headerShadow }}
        aria-hidden={!isMenuOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <nav className="flex h-[calc(100dvh-5.5rem)] w-full flex-col px-6 py-8">
            <Link
              href="/booking"
              className="border-b border-border/60 py-5 text-2xl font-medium text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Booking
            </Link>
            <Link
              href="#technology"
              className="border-b border-border/60 py-5 text-2xl font-medium text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Workspace
            </Link>
            <Link
              href="#gallery"
              className="border-b border-border/60 py-5 text-2xl font-medium text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Locations
            </Link>
            <Link
              href="#accessories"
              className="border-b border-border/60 py-5 text-2xl font-medium text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Memberships
            </Link>
            <Link
              href="#about"
              className="border-b border-border/60 py-5 text-2xl font-medium text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Experience
            </Link>
            <Link
              href="/contact"
              className="mt-auto rounded-full bg-foreground px-5 py-4 text-center text-sm font-medium text-background"
              onClick={() => setIsMenuOpen(false)}
            >
              Book a tour
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
