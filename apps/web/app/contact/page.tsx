import { MarketingPageShell } from "@/components/marketing-page-shell";

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact"
      title="Book a tour, ask about memberships, or plan space for your team."
      intro="If you are choosing between flexible desks, private offices, or meeting room access, we can help you find the right setup without overcommitting."
    >
      <div className="grid gap-8 md:grid-cols-2">
        <div className="border border-border p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Email</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">hello@metrix.space</p>
        </div>
        <div className="border border-border p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Phone</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">+1 (555) 240-0199</p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
