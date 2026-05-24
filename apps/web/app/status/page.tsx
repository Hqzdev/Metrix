import { ResourcePage } from "@/components/resource-page";

export default function StatusPage() {
  return (
    <ResourcePage
      eyebrow="Status"
      title="The booking network health board."
      intro="A public-style status surface for the website, Telegram bot, payment confirmation, venue sync, and receipt delivery."
      metrics={[
        { value: "99.9%", label: "website availability" },
        { value: "99.7%", label: "bot availability" },
        { value: "30s", label: "venue confirmation target" },
        { value: "0", label: "active incidents" },
      ]}
      cards={[
        { tag: "Operational", title: "Telegram bot", body: "@metritxsxbot is accepting location search, booking holds, confirmations, and support messages." },
        { tag: "Operational", title: "Payments", body: "Payment status callbacks are being received and attached to booking receipts." },
        { tag: "Operational", title: "Venue sync", body: "Moscow inventory is available for location, resource, and price display." },
        { tag: "Operational", title: "Website", body: "Marketing, company, legal, and resource pages are rendering as static routes." },
      ]}
      bars={[
        { label: "Website", value: 99, caption: "static routes" },
        { label: "Bot", value: 98, caption: "Telegram flow" },
        { label: "Payments", value: 96, caption: "confirmation callbacks" },
        { label: "Venue sync", value: 94, caption: "inventory feed" },
      ]}
      tableTitle="Service components"
      tableColumns={["Component", "Status", "SLA target", "Last note"]}
      tableRows={[
        { cells: ["Website", "Operational", "99.9%", "all public pages building"], accent: true },
        { cells: ["Telegram bot", "Operational", "99.7%", "booking flow available"] },
        { cells: ["Payments", "Operational", "99.5%", "receipt callbacks active"] },
        { cells: ["Venue sync", "Operational", "99.0%", "10 Moscow locations listed"], accent: true },
      ]}
    />
  );
}
