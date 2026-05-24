const companies = ["Sbercode", "Rocketly", "Talentiq", "Hypelab", "Framely", "Novaflow"];

const testimonials = [
  {
    initials: "AK",
    color: "bg-indigo-500",
    name: "Andrew Kim",
    role: "Freelance Developer",
    company: "Self-employed",
    quote:
      "I book a desk in literally 30 seconds right inside Telegram. No new app, no account setup. Just tap and you know the spot is yours.",
  },
  {
    initials: "MP",
    color: "bg-violet-500",
    name: "Maria Powell",
    role: "Head of Product",
    company: "Rocketly",
    quote:
      "We book meeting rooms for the team every week. Metrix is the only service with zero double-bookings — the availability data is genuinely real-time.",
  },
  {
    initials: "DV",
    color: "bg-pink-500",
    name: "Dan Voronov",
    role: "Co-founder",
    company: "Hypelab",
    quote:
      "We moved from a fixed monthly lease to a flexible Metrix plan and cut workspace spend by ~40%. The team loves not being tied to one location.",
  },
];

export function CollectionSection() {
  return (
    <section id="social-proof" className="bg-[#FAFAFA] dark:bg-zinc-950 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">

        <div data-reveal className="mb-12 text-center">
          <p className="mb-6 text-sm font-medium text-zinc-400">Used by teams at:</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {companies.map((c) => (
              <span key={c} className="text-sm font-semibold tracking-wide text-zinc-300 dark:text-zinc-600">{c}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              data-reveal
              data-delay={String(i * 100)}
              className="flex flex-col gap-5 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700/50 dark:bg-zinc-800"
            >
              <p className="flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
