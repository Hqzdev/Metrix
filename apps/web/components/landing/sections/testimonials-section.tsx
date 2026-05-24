import { CountUpNumber } from "@/components/metrics/count-up-number";

const stats = [
  { value: "500+", label: "Bookings per month" },
  { value: "12", label: "Locations in Moscow" },
  { value: "30 sec", label: "Avg booking time" },
  { value: "99.9%", label: "Uptime" },
];

export function TestimonialsSection() {
  return (
    <section className="bg-zinc-900 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              data-reveal
              data-delay={String(i * 80)}
              className="flex flex-col items-center gap-2 text-center"
            >
              <CountUpNumber
                value={s.value}
                className="text-5xl font-bold tracking-tight text-white md:text-6xl"
              />
              <span className="text-sm text-zinc-400">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
