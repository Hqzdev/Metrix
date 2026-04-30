"use client";

import Image from "next/image";

export function TestimonialsSection() {
  return (
    <section id="about" className="bg-background">
      <div className="relative min-h-[560px] w-full md:aspect-[16/9] md:min-h-0">
        <Image
          src="/images/testimonial-house.png"
          alt="Coworking team collaborating in a premium office environment"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        <div className="absolute inset-0 flex items-end justify-center px-5 pb-12 md:px-12 md:pb-24 lg:px-20 lg:pb-32">
          <p className="mx-auto max-w-[22rem] text-center text-[1.55rem] leading-snug text-white sm:max-w-2xl sm:text-2xl sm:leading-relaxed md:max-w-4xl md:text-3xl lg:max-w-5xl lg:text-[2.5rem] lg:leading-snug">
            Metrix gives teams a place that feels ready before they arrive: desks that can be booked in seconds,
            rooms that stay available when the meeting matters, and a workspace brand people are proud to bring clients into.
          </p>
        </div>
      </div>
    </section>
  );
}
