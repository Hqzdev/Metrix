"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

interface CountUpNumberProps {
  value: string;
  className?: string;
  startValue?: number;
  durationMs?: number;
}

export function CountUpNumber({ value, className, startValue = 0, durationMs = 1200 }: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const el = ref.current;
    if (!el) return;

    const match = value.match(/^([\d\s.,]+)(.*)/);
    if (!match) return;

    const numberText = match[1];
    const normalized = numberText.replace(/\s/g, "").replace(",", ".");
    const target = parseFloat(normalized);
    const suffix = match[2];
    const isDecimal = normalized.includes(".");
    const usesGrouping = /\s/.test(numberText) || target >= 1000;
    let startTime: number | null = null;
    let rafId: number;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const animate = (now: number) => {
          if (startTime === null) startTime = now;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          const current = startValue + (target - startValue) * easeOutCubic(progress);
          const formatted = isDecimal
            ? current.toFixed(1)
            : usesGrouping
              ? new Intl.NumberFormat("ru-RU").format(Math.round(current))
              : Math.round(current).toString();
          setDisplay(formatted + suffix);
          if (progress < 1) rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);
      },
      { threshold: 0.3 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [durationMs, startValue, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
