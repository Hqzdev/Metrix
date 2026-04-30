import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow="Privacy Policy"
      title="We collect only what is needed to operate workspace access and bookings."
      intro="This page outlines how Metrix handles member data, booking records, workspace access information, and communication preferences."
    >
      <div className="space-y-8 text-base leading-8 text-muted-foreground">
        <p>
          We use customer information to manage memberships, workspace bookings, support requests,
          billing operations, and service communications.
        </p>
        <p>
          We do not sell personal information. Data is processed only to deliver access, improve
          operations, and keep the booking experience reliable.
        </p>
      </div>
    </MarketingPageShell>
  );
}
