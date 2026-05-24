import { LegalPage } from "@/components/pages/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Only the data needed to open the right door."
      intro="Metrix uses Telegram identity, booking state, payment confirmation, and location preference data to run workspace bookings. No ad targeting, no resale, no hidden profile building."
      updated="May 24, 2026"
      metrics={[
        { value: "12m", label: "booking record retention" },
        { value: "0", label: "card numbers stored by Metrix" },
        { value: "30s", label: "venue confirmation window" },
        { value: "1", label: "support channel in Telegram" },
      ]}
      sections={[
        { title: "What we collect", body: "We process Telegram user ID, booking history, selected location, booking time, resource type, payment confirmation status, cancellation events, and support messages you send to Metrix.", meta: "Collected when you use the bot or booking demo." },
        { title: "What we do not collect", body: "Metrix does not need your password, full payment card number, device contact book, or private Telegram messages outside the Metrix bot conversation.", meta: "Payment credentials stay with the payment provider." },
        { title: "How data is used", body: "We use booking data to show availability, confirm a desk or room, issue a door code, send receipts, prevent double-booking, and resolve refunds or disputes.", meta: "Operational use only." },
        { title: "Sharing with venues", body: "Relevant venue operators receive the booking name or Telegram handle, time window, resource, people count, and payment confirmation needed to prepare the space.", meta: "Shared only for the selected venue." },
        { title: "Deletion and access", body: "You can request export, correction, or deletion through @metritxsxbot or hello@metrix.app. Accounting records may be retained where legally required.", meta: "Handled by support." },
      ]}
      tableTitle="Data handling matrix"
      tableColumns={["Data", "Purpose", "Retention", "Shared with"]}
      tableRows={[
        { cells: ["Telegram ID", "account and receipt matching", "until deletion request", "Metrix only"], accent: true },
        { cells: ["Booking record", "access, refunds, disputes", "12 months", "selected venue"] },
        { cells: ["Payment status", "confirm paid bookings", "accounting period", "payment provider"] },
        { cells: ["Location preference", "surface nearby spaces", "until changed", "Metrix only"] },
        { cells: ["Support messages", "resolve booking issues", "12 months", "Metrix support"], accent: true },
      ]}
    />
  );
}
