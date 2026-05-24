import { ResourcePage } from "@/components/resource-page";

export default function FaqPage() {
  return (
    <ResourcePage
      eyebrow="FAQ"
      title="Answers before a team books the room."
      intro="Operational questions about Telegram booking, payments, cancellations, offices, and the Moscow workspace network."
      metrics={[
        { value: "60m", label: "free cancellation window" },
        { value: "6%", label: "visible service fee" },
        { value: "10", label: "Moscow locations" },
        { value: "8s", label: "target booking time" },
      ]}
      cards={[
        { tag: "Booking", title: "Do I need an account?", body: "No. Telegram identity is enough. Open the bot, choose a location, pick a resource, and confirm payment." },
        { tag: "Payment", title: "How are prices shown?", body: "Prices are shown in RUB before confirmation: venue rate, extras, and the Metrix service fee are separated in the receipt." },
        { tag: "Access", title: "Where does the door code arrive?", body: "Confirmed bookings receive access instructions and a door code directly in the Telegram thread." },
        { tag: "Offices", title: "Can teams book private offices?", body: "Yes. Current office inventory includes Transit Office, Bridge Office, and Founder Office with monthly pricing." },
        { tag: "Refunds", title: "What if a venue is unavailable?", body: "Metrix helps find a nearby replacement or processes a refund when a confirmed resource cannot be prepared." },
        { tag: "Locations", title: "Which locations are live?", body: "Patriarchy, Belorusskaya, Paveletskaya, Moscow City, Kurskaya, Park Kultury, Tverskaya, Chistye Prudy, Taganskaya, and Sokol." },
      ]}
      bars={[
        { label: "Booking", value: 92, caption: "chat-native flow" },
        { label: "Cancellation", value: 76, caption: "60 minute window" },
        { label: "Office demand", value: 84, caption: "monthly inventory" },
        { label: "Support", value: 68, caption: "Telegram first" },
      ]}
      tableTitle="Common cases"
      tableColumns={["Question", "Short answer", "Where", "Rule"]}
      tableRows={[
        { cells: ["Need a desk today?", "Book a daily desk", "Belorusskaya / Paveletskaya", "from 2 900 RUB"], accent: true },
        { cells: ["Need a meeting room?", "Book hourly", "Rail / Investor / Garden", "from 27 000 RUB"] },
        { cells: ["Need a private office?", "Book monthly", "Transit / Bridge / Founder", "from 1.08M RUB"] },
        { cells: ["Need to cancel?", "Use the bot", "booking thread", "60m free window"], accent: true },
      ]}
    />
  );
}
