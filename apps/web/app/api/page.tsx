import { ResourcePage } from "@/components/resource-page";

export default function ApiPage() {
  return (
    <ResourcePage
      eyebrow="API"
      title="A booking interface for operators and tools."
      intro="A public API overview for the Metrix workspace layer. The website is static; live booking actions happen in Telegram, with operator APIs planned for partner integrations."
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
        { tag: "BOT", title: "Telegram handoff", body: "The production booking flow lives in @metritxsxbot. The website stays static and sends users into Telegram for live actions." },
      ]}
      bars={[
        { label: "Availability", value: 90, caption: "location and resource data" },
        { label: "Holds", value: 74, caption: "temporary reservation logic" },
        { label: "Receipts", value: 86, caption: "payment confirmation" },
        { label: "Support", value: 62, caption: "dispute metadata" },
      ]}
      tableTitle="Endpoint overview"
      tableColumns={["Surface", "Method", "Purpose", "Status"]}
      tableRows={[
        { cells: ["@metritxsxbot", "Telegram", "live booking and confirmation", "available"], accent: true },
        { cells: ["Website calculator", "Static", "pricing preview and demo flow", "available"] },
        { cells: ["Operator API", "REST", "availability and booking holds", "planned"] },
        { cells: ["Receipts export", "CSV/API", "accounting handoff", "planned"], accent: true },
      ]}
      codeSample={`const botUrl = "https://t.me/metritxsxbot";
window.open(botUrl, "_blank");`}
    />
  );
}
