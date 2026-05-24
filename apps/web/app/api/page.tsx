import { ResourcePage } from "@/components/resource-page";

export default function ApiPage() {
  return (
    <ResourcePage
      eyebrow="API"
      title="A booking interface for operators and tools."
      intro="A public API overview for the Metrix workspace layer: availability, booking holds, confirmations, receipts, and shared booking objects."
      metrics={[
        { value: "REST", label: "interface style" },
        { value: "JSON", label: "response format" },
        { value: "5m", label: "booking hold TTL" },
        { value: "6%", label: "service fee model" },
      ]}
      cards={[
        { tag: "GET", title: "Availability", body: "Fetch available locations, resources, time windows, and live RUB rates for desks, rooms, offices, and team pods." },
        { tag: "POST", title: "Booking hold", body: "Create a temporary hold before payment confirmation. Holds expire automatically when not confirmed." },
        { tag: "POST", title: "Confirmation", body: "Attach payment status, venue confirmation, receipt ID, and access instructions to a booking." },
        { tag: "GET", title: "Shared bookings", body: "Read shared booking payloads used by web previews and Telegram handoff flows." },
      ]}
      bars={[
        { label: "Availability", value: 90, caption: "location and resource data" },
        { label: "Holds", value: 74, caption: "temporary reservation logic" },
        { label: "Receipts", value: 86, caption: "payment confirmation" },
        { label: "Support", value: 62, caption: "dispute metadata" },
      ]}
      tableTitle="Endpoint overview"
      tableColumns={["Endpoint", "Method", "Purpose", "Status"]}
      tableRows={[
        { cells: ["/api/shared-bookings", "GET", "read shared booking data", "available"], accent: true },
        { cells: ["/api/availability", "GET", "location and resource search", "planned"] },
        { cells: ["/api/booking-holds", "POST", "create 5 minute hold", "planned"] },
        { cells: ["/api/receipts", "POST", "attach payment receipt", "planned"], accent: true },
      ]}
      codeSample={`fetch("/api/shared-bookings")
  .then((response) => response.json())
  .then((booking) => {
    console.log(booking.location, booking.total);
  });`}
    />
  );
}
