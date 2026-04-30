"use client";

import { FadeImage } from "@/components/fade-image";

const features = [
  {
    image: "/images/workspace-lounge-large.png",
    span: "col-span-2 row-span-2",
  },
  {
    image: "/images/workspace-desk-small.png",
    span: "col-span-1 row-span-1",
  },
  {
    image: "/images/meeting-room-small.png",
    span: "col-span-1 row-span-1",
  },
  {
    image: "/images/private-office-tall.png",
    span: "col-span-1 row-span-2",
  },
  {
    image: "/images/coworking-corner-small.png",
    span: "col-span-1 row-span-1",
  },
  {
    image: "/images/team-space-wide.png",
    span: "col-span-2 row-span-1",
  },
  {
    image: "/images/focus-desk-small.png",
    span: "col-span-1 row-span-1",
  },
  {
    image: "/images/phone-booth-tall.png",
    span: "col-span-1 row-span-2",
  },
  {
    image: "/images/lounge-space-wide.png",
    span: "col-span-2 row-span-1",
  },
  {
    image: "/images/workspace-detail-small.png",
    span: "col-span-1 row-span-1",
  },
];

export function FeaturedProductsSection() {
  return (
    <section id="technology" className="relative bg-background py-20 md:py-32">
      <div className="px-4 md:px-12 lg:px-20">
        <div className="mx-auto mb-12 flex max-w-7xl flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Workspace system
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground md:text-5xl">
              Built for daily focus, client meetings, and team rhythm.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            One network of premium workspaces with hot desks, dedicated desks, private offices,
            lounge zones, meeting rooms, and quiet corners for heads-down work.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-7xl mx-auto auto-rows-[180px] md:auto-rows-[220px]">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`relative overflow-hidden rounded-lg border border-gray-200 ${feature.span}`}
            >
              <FadeImage
                src={feature.image || "/placeholder.svg"}
                alt={`Metrix coworking space preview ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
