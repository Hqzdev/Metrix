"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnimationInit() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els.length) return;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("revealed"));
      root.classList.remove("reveal-ready");
      return;
    }

    root.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = parseInt(el.dataset.delay ?? "0", 10);
            setTimeout(() => el.classList.add("revealed"), delay);
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -30px 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
