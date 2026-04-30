import { MarketingPageShell } from "@/components/marketing-page-shell";

const locations = [
  {
    name: "Central District",
    details: "Open-plan desks, 6 meeting rooms, 24/7 access, client-ready reception.",
  },
  {
    name: "Riverside Campus",
    details: "Private offices for growing teams, café lounge, podcast room, phone booths.",
  },
  {
    name: "North Quarter",
    details: "Quiet work floor, flexible day passes, project rooms, evening access.",
  },
];

export default function LocationsPage() {
  return (
    <MarketingPageShell
      eyebrow="Locations"
      title="Choose the workspace that fits the day."
      intro="Metrix locations are designed as a network, so members can move between focused desk time, team sessions, and client-facing meetings without breaking the workflow."
    >
      <div className="grid gap-6">
        {locations.map((location) => (
          <div key={location.name} className="border border-border bg-secondary/40 p-8">
            <h2 className="text-2xl font-medium tracking-tight">{location.name}</h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-muted-foreground">
              {location.details}
            </p>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  );
}
