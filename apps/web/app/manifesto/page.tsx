import { CompanyPage } from "@/components/pages/company-page";

export default function ManifestoPage() {
  return (
    <CompanyPage
      variant="manifesto"
      eyebrow="Manifesto"
      title="Offices should be programmable, not painful."
      intro="We believe workspace access should feel instant, priced clearly, and confirmed by software that respects the messiness of real buildings."
      metrics={[
        { value: "1", label: "chat thread", detail: "Discovery, booking, payment, code, and receipt." },
        { value: "100%", label: "price clarity", detail: "Venue rate plus visible service fee." },
        { value: "10", label: "local anchors", detail: "A focused Moscow network before broad expansion." },
        { value: "60m", label: "cancel window", detail: "Flexibility without chaos for venue teams." },
      ]}
      bars={[
        { label: "Speed", value: 92, caption: "book before context-switching" },
        { label: "Clarity", value: 86, caption: "show the true venue price" },
        { label: "Reliability", value: 80, caption: "live-confirm every booking" },
        { label: "Local density", value: 74, caption: "deeper before wider" },
      ]}
      tableTitle="Principles"
      tableColumns={["Principle", "What it means", "Product behavior", "Metric"]}
      tableRows={[
        { cells: ["Fast beats formal", "No account ceremony", "Telegram-first booking", "8s target"], hot: true },
        { cells: ["Prices must be visible", "No hidden markup", "RUB rate plus fee", "6% fee"] },
        { cells: ["Buildings are live systems", "Availability changes", "confirm before charging", "30s check"] },
        { cells: ["Local density wins", "Useful clusters first", "10 Moscow locations", "coverage"], hot: true },
      ]}
      timelineTitle="Operating beliefs"
      timeline={[
        { period: "A", title: "Make the useful thing obvious", body: "The user should see a location, a slot, and a price before we ask for commitment." },
        { period: "B", title: "Keep humans in the loop", body: "Venue teams still matter. Software should make their work calmer and more accurate." },
        { period: "C", title: "Measure trust", body: "A booking product earns trust through confirmation speed, refunds, receipts, and honest pricing." },
      ]}
      note="This manifesto is not decorative copy. It is the checklist for how Metrix should behave when people need a room now."
    />
  );
}
