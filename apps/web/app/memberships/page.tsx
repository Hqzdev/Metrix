import { MarketingPageShell } from "@/components/marketing-page-shell";

const plans = [
  {
    name: "Day Pass",
    price: "$29",
    description: "One day of flexible desk access with fast Wi-Fi, lounge use, and bookable add-ons.",
  },
  {
    name: "Dedicated Desk",
    price: "$240/mo",
    description: "A consistent workstation for people who want routine, storage, and access throughout the month.",
  },
  {
    name: "Private Office",
    price: "$890/mo",
    description: "A ready office suite for teams that need privacy, client comfort, and a shorter commitment than a traditional lease.",
  },
];

export default function MembershipsPage() {
  return (
    <MarketingPageShell
      eyebrow="Memberships"
      title="Plans built for solo operators, hybrid teams, and companies in motion."
      intro="Choose day access, a permanent desk, or a private office. Every plan is designed to keep booking simple and scaling predictable."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="border border-border p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{plan.name}</p>
            <p className="mt-6 text-4xl font-medium tracking-tight">{plan.price}</p>
            <p className="mt-4 text-base leading-8 text-muted-foreground">{plan.description}</p>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  );
}
