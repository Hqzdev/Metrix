import { CompanyPage } from "@/components/company-page";

export default function AboutPage() {
  return (
    <CompanyPage
      eyebrow="About Metrix"
      title="Workspace operations, measured like infrastructure."
      intro="Metrix runs a live workspace layer across Moscow: desks, rooms, offices, and team pods that can be booked from Telegram with real availability and RUB pricing."
      metrics={[
        { value: "10", label: "Moscow locations", detail: "From Patriarchy and Belorusskaya to Sokol." },
        { value: "78%", label: "top occupancy", detail: "Patriarchy Clubhouse leads the active network." },
        { value: "3", label: "core inventory types", detail: "Daily desks, hourly rooms, and monthly offices." },
        { value: "6%", label: "service fee", detail: "Simple pricing on top of the live venue rate." },
      ]}
      bars={[
        { label: "Patriarchy", value: 78, caption: "164 active members" },
        { label: "Moscow City", value: 84, caption: "196 active members" },
        { label: "Paveletskaya", value: 72, caption: "141 active members" },
        { label: "Sokol", value: 58, caption: "89 active members" },
      ]}
      tableTitle="Network snapshot"
      tableColumns={["Location", "Address", "Occupancy", "Active members"]}
      tableRows={[
        { cells: ["Patriarchy Clubhouse", "18 Malaya Bronnaya Street", "78%", "164"], hot: true },
        { cells: ["Belorusskaya Hub", "34 Lesnaya Street", "66%", "119"] },
        { cells: ["Paveletskaya Loft", "5 Letnikovskaya Street", "72%", "141"] },
        { cells: ["Moscow City North Tower", "12 Presnenskaya Embankment", "84%", "196"], hot: true },
        { cells: ["Sokol Studio", "14 Leningradsky Avenue", "58%", "89"] },
      ]}
      timelineTitle="What we built"
      timeline={[
        { period: "2024", title: "Telegram-first booking", body: "The first flow turned search, payment, receipt, and door code into one chat thread." },
        { period: "2025", title: "Live inventory layer", body: "Availability and pricing moved from static pages to operational data." },
        { period: "2026", title: "Moscow network", body: "Ten locations are presented as one bookable workspace surface." },
      ]}
      note="The company pages use the same Moscow inventory story as the landing page, so the brand no longer feels like a generic European coworking template."
    />
  );
}
