import { LegalPage } from "@/components/pages/legal-page";

export default function ImprintPage() {
  return (
    <LegalPage
      eyebrow="Imprint"
      title="Company and operator information."
      intro="This page identifies the Metrix booking operator, product contact points, and the operating scope for the Moscow workspace network."
      updated="May 24, 2026"
      metrics={[
        { value: "MOW", label: "primary operating region" },
        { value: "2024", label: "product launch year" },
        { value: "10", label: "listed locations" },
        { value: "24/7", label: "bot availability" },
      ]}
      sections={[
        { title: "Operator", body: "Metrix Booking operates the public website and Telegram booking experience for flexible workspace discovery, booking, receipts, and support.", meta: "Commercial name: Metrix Booking." },
        { title: "Registered contact", body: "For legal and operational notices, contact hello@metrix.app. Booking support is handled through @metritxsxbot and support replies in Telegram.", meta: "Primary language: English." },
        { title: "Business scope", body: "Metrix coordinates bookings for desks, meeting rooms, private offices, and team pods across participating Moscow locations.", meta: "Metrix is not the owner of every venue." },
        { title: "Editorial responsibility", body: "Website content, pricing presentation, interface copy, and public company pages are maintained by the Metrix product team.", meta: "Last editorial sweep: May 2026." },
        { title: "Dispute contact", body: "For payment, access, or venue disputes, include your Telegram handle, booking time, venue name, and receipt ID if available.", meta: "Send to hello@metrix.app." },
      ]}
      tableTitle="Company reference"
      tableColumns={["Item", "Value", "Use", "Contact"]}
      tableRows={[
        { cells: ["Commercial name", "Metrix Booking", "website and bot", "hello@metrix.app"], accent: true },
        { cells: ["Region", "Moscow", "workspace network", "@metritxsxbot"] },
        { cells: ["Product", "Telegram booking", "reservations and receipts", "@metritxsxbot"] },
        { cells: ["Support", "booking issues", "refunds and access", "hello@metrix.app"], accent: true },
        { cells: ["Website", "metrix public pages", "company and legal info", "product team"] },
      ]}
    />
  );
}
