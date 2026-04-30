"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

interface FadeImageProps extends Omit<ImageProps, "onLoad"> {
  fadeDelay?: number;
}

export function FadeImage({ className, fadeDelay = 0, ...props }: FadeImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set visible immediately if no IntersectionObserver support
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, fadeDelay);
          observer.disconnect();
        }
      },
      {
        threshold: 0.01,
        rootMargin: "200px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [fadeDelay]);

  // Show image immediately if it's already loaded from cache
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Determine visibility - show if either loaded and visible, or after a timeout
  const shouldShow = isVisible && isLoaded;

  return (
    <div ref={ref} className="relative h-full w-full">
      <Image
        {...props}
        className={`${className || ""} transition-all duration-700 ease-out ${
          shouldShow ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
        }`}
        onLoad={handleLoad}
        loading="eager"
      />
    </div>
  );
}
