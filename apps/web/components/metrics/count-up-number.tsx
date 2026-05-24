"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

interface CountUpNumberProps {
  value: string;
  className?: string;
}

export function CountUpNumber({ value, className }: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const el = ref.current;
    if (!el) return;

    const match = value.match(/^(\d+\.?\d*)(.*)/);
    if (!match) return;

    const target = parseFloat(match[1]);
    const suffix = match[2];
    const isDecimal = match[1].includes(".");
    const duration = 1200;
    let startTime: number | null = null;
    let rafId: number;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const animate = (now: number) => {
          if (startTime === null) startTime = now;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const current = target * easeOutCubic(progress);
          const formatted = isDecimal ? current.toFixed(1) : Math.round(current).toString();
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
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
