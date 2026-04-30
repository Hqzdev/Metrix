import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow="Terms of Service"
      title="Clear rules for booking, access, and membership usage."
      intro="These terms describe how Metrix memberships, workspace reservations, meeting room access, payments, and on-site conduct are handled."
    >
      <div className="space-y-8 text-base leading-8 text-muted-foreground">
        <p>
          Members are responsible for using booked desks, rooms, and offices according to the selected plan,
          location rules, and fair-use policies.
        </p>
        <p>
          Meeting room reservations, cancellations, and plan limits may vary by location and membership type.
          Specific commercial terms are communicated during onboarding or invoicing.
        </p>
      </div>
    </MarketingPageShell>
  );
}
