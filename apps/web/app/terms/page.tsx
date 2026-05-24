import { LegalPage } from "@/components/pages/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Clear rules for booking Moscow workspaces."
      intro="These terms explain how Metrix bookings, cancellations, payments, venue access, and fair-use rules work for Telegram-based workspace reservations."
      updated="May 24, 2026"
      metrics={[
        { value: "60m", label: "free cancellation window" },
        { value: "6%", label: "Metrix service fee" },
        { value: "5m", label: "temporary hold before payment" },
        { value: "10", label: "live Moscow locations" },
      ]}
      sections={[
        { title: "Bookings", body: "A booking is confirmed when payment is accepted and the venue confirms availability. The Telegram chat then receives the booking summary, receipt, and access instructions.", meta: "Confirmation appears in chat." },
        { title: "Cancellations", body: "You can cancel free of charge up to 60 minutes before check-in. Later cancellations may be non-refundable because the venue has already held the space.", meta: "Refund timing depends on payment provider processing." },
        { title: "Fair use", body: "Booked spaces are for professional work. Subletting, disruptive behavior, unsafe activity, and using a resource beyond the confirmed time window are not allowed.", meta: "Venue rules still apply." },
        { title: "Prices and fees", body: "You pay the venue's live RUB rate plus the visible Metrix service fee. Prices may vary by venue, resource type, date, and availability.", meta: "Shown before confirmation." },
        { title: "Venue issues", body: "If a confirmed space is unavailable, Metrix will help find a nearby replacement or process a refund where appropriate.", meta: "Handled through support." },
        { title: "Changes", body: "We may update these terms when the product, network, or law changes. Material updates will be announced through the website or bot.", meta: "Continued use means acceptance." },
      ]}
      tableTitle="Booking rules"
      tableColumns={["Rule", "Window", "Result", "Channel"]}
      tableRows={[
        { cells: ["Temporary hold", "5 minutes", "space reserved while paying", "Telegram"], accent: true },
        { cells: ["Free cancellation", "60+ minutes before", "full refund request", "Telegram"] },
        { cells: ["Late cancellation", "under 60 minutes", "venue policy applies", "Telegram"] },
        { cells: ["No-show", "after start time", "booking consumed", "venue record"] },
        { cells: ["Venue unavailable", "any time", "replacement or refund", "support"], accent: true },
      ]}
    />
  );
}
