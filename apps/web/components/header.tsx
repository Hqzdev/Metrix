"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl rounded-full bg-background/80 backdrop-blur-md transition-all duration-300"
      style={{
        boxShadow: "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"
      }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-8 transition-all duration-300 px-3 pl-6 py-2">
        {/* Logo */}
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

        {/* Desktop Navigation */}
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

        {/* CTA */}
        <div className="hidden items-center justify-end md:flex">
          <Link
            href="/contact"
            className="px-4 py-2 text-sm font-medium transition-all rounded-full bg-foreground text-background hover:opacity-80"
          >
            Book a tour
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="justify-self-end transition-colors md:hidden text-foreground"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-border bg-background px-6 py-8 md:hidden rounded-b-2xl">
          <nav className="flex flex-col gap-6">
            <Link
              href="/booking"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Booking
            </Link>
            <Link
              href="#technology"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Workspace
            </Link>
            <Link
              href="#gallery"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Locations
            </Link>
            <Link
              href="#accessories"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Memberships
            </Link>
            <Link
              href="#about"
              className="text-lg text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Experience
            </Link>
            <Link
              href="/contact"
              className="mt-4 bg-foreground px-5 py-3 text-center text-sm font-medium text-background rounded-full"
              onClick={() => setIsMenuOpen(false)}
            >
              Book a tour
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
