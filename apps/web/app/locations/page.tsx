import Link from "next/link";
import { MarketingPageShell } from "@/components/layout/marketing-page-shell";

const locations = [
  {
    id: "patriarchy",
    name: "Patriarchy Clubhouse",
    district: "Patriarshiye Ponds",
    address: "18 Malaya Bronnaya Street",
    occupancy: "78%",
    deskPrice: "₽2,800/day",
    tags: ["6 meeting rooms", "24/7 access", "Client reception"],
    color: "from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40",
  },
  {
    id: "city-north",
    name: "Moscow City North Tower",
    district: "Moscow City",
    address: "12 Presnenskaya Embankment",
    occupancy: "84%",
    deskPrice: "₽3,200/day",
    tags: ["Panoramic views", "Executive suites", "High demand"],
    color: "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
  },
  {
    id: "tverskaya",
    name: "Tverskaya Rooms",
    district: "Tverskaya",
    address: "7 Tverskaya Street",
    occupancy: "76%",
    deskPrice: "₽2,700/day",
    tags: ["Central location", "Meeting rooms", "Day passes"],
    color: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
  },
  {
    id: "belorusskaya",
    name: "Belorusskaya Hub",
    district: "Belorusskaya",
    address: "34 Lesnaya Street",
    occupancy: "66%",
    deskPrice: "₽2,400/day",
    tags: ["Café lounge", "Podcast room", "Team zones"],
    color: "from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40",
  },
  {
    id: "paveletskaya",
    name: "Paveletskaya Loft",
    district: "Paveletskaya",
    address: "5 Letnikovskaya Street",
    occupancy: "72%",
    deskPrice: "₽2,550/day",
    tags: ["Loft interiors", "Phone booths", "Quiet floor"],
    color: "from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40",
  },
  {
    id: "park-kultury",
    name: "Park Kultury House",
    district: "Park Kultury",
    address: "21 Zubovsky Boulevard",
    occupancy: "63%",
    deskPrice: "₽2,300/day",
    tags: ["Garden views", "Evening access", "Best availability"],
    color: "from-lime-50 to-green-50 dark:from-lime-950/40 dark:to-green-950/40",
  },
];

export default function LocationsPage() {
  return (
    <MarketingPageShell
      eyebrow="Locations"
      title="12 locations across Moscow."
      intro="Browse our network of coworking spaces. Each location shows live availability — hover the map on the Booking page to compare in real time."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {locations.map((loc, i) => (
          <div
            key={loc.id}
            data-reveal="scale"
            data-delay={String(i * 70)}
            className={`rounded-2xl bg-gradient-to-br ${loc.color} border border-zinc-100 dark:border-zinc-700/50 p-7 transition-shadow hover:shadow-lg`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {loc.district}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">{loc.name}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{loc.address}</p>
              </div>
              <div className="shrink-0 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm dark:bg-zinc-800/80 dark:text-zinc-200">
                {loc.occupancy} full
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {loc.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/50 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700/50 dark:bg-zinc-800/60 dark:text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">From {loc.deskPrice}</span>
              <Link
                href="/booking"
                className="rounded-full bg-[#6366F1] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#4338CA]"
              >
                Book now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  );
}
