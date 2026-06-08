"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, TelegramIcon } from "@hugeicons/core-free-icons";

export const TELEGRAM_BOT_URL = "https://t.me/metritxsxbot";

const navItems = [
  ["Spaces", "/#spaces"],
  ["How it works", "/#how"],
  ["Pricing", "/#demo"],
  ["For business", "/#b2b"],
  ["FAQ", "/#faq"],
];

export function MetrixHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".metrix-hero");

    if (!hero || typeof IntersectionObserver === "undefined") {
      const onScroll = () => setScrolled(window.scrollY > 12);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolled(!entry.isIntersecting && window.scrollY > 12);
      },
      { rootMargin: "-96px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header className={`metrix-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="metrix-nav-inner">
        <Link href="/" className="metrix-logo" aria-label="Metrix home">
          Metrix<b>.</b>
        </Link>

        <nav className="metrix-nav-links" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="metrix-nav-actions">
          <a href={TELEGRAM_BOT_URL} className="metrix-btn metrix-btn-primary" target="_blank" rel="noreferrer">
            <HugeiconsIcon icon={TelegramIcon} size={15} strokeWidth={1.9} aria-hidden="true" /> Open <span>in</span> Telegram
          </a>
        </div>
      </div>
    </header>
  );
}

export function MetrixFooter() {
  const groups: Array<[string, Array<[string, string]>]> = [
    ["Spaces", [["Hot desks", "/#spaces"], ["Meeting rooms", "/#spaces"], ["Private offices", "/#spaces"]]],
    ["Help", [["FAQ", "/#faq"]]],
    ["Get in touch", [["@metritxsxbot", TELEGRAM_BOT_URL], ["hello@metrix.app", "mailto:hello@metrix.app"]]],
  ];

  return (
    <footer className="metrix-footer">
      <div className="metrix-wrap">
        <div className="metrix-footer-grid" data-reveal>
          <div>
            <Link href="/" className="metrix-logo">
              <Image src="/icons/app-icon-light.png" alt="" width={30} height={30} className="metrix-logo-icon" />
              Metrix<b>.</b>
            </Link>
            <p>Booking workspaces shouldn&apos;t feel like booking a flight. Built for Moscow offices · since 2024.</p>
          </div>
          {groups.map(([title, items]) => (
            <nav key={title} aria-label={title}>
              <h3 className="metrix-eyebrow">{title}</h3>
              {items.map(([item, href]) => (
                <a key={item} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noreferrer" : undefined}>
                  {item}
                </a>
              ))}
            </nav>
          ))}
        </div>
        <hr className="metrix-rule" />
        <div className="metrix-footer-bottom" data-reveal data-delay="80">
          <span>© 2026 Metrix Booking · Moscow</span>
          <span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/imprint">Imprint</Link>
          </span>
        </div>
        <div className="metrix-wordmark" data-reveal="scale" data-delay="120">
          Metrix<span className="metrix-dot">.</span>
        </div>
      </div>
    </footer>
  );
}

export function Arrow({ size = 16 }: { size?: number }) {
  return <HugeiconsIcon icon={ArrowRight02Icon} size={size} strokeWidth={2} className="metrix-arrow" aria-hidden="true" />;
}
