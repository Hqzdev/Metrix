import { CompanyPage } from "@/components/company-page";

export default function PressPage() {
  return (
    <CompanyPage
      variant="press"
      eyebrow="Press"
      title="Signals, numbers, and angles for the Metrix story."
      intro="A press room for launches, market notes, and operating metrics. It gives editors hard numbers instead of soft coworking adjectives."
      metrics={[
        { value: "10", label: "locations live", detail: "All in Moscow for the current beta." },
        { value: "1.08M", label: "RUB office floor", detail: "Entry private office monthly price." },
        { value: "27K", label: "RUB room floor", detail: "Hourly meeting room floor from Belorusskaya." },
        { value: "2.9K", label: "RUB desk floor", detail: "Daily desk floor from Belorusskaya." },
      ]}
      bars={[
        { label: "Desk demand", value: 74, caption: "daily and monthly inventory" },
        { label: "Meeting rooms", value: 63, caption: "highest weekly utilization" },
        { label: "Team pods", value: 68, caption: "monthly desk bundles" },
        { label: "Offices", value: 81, caption: "private office availability" },
      ]}
      tableTitle="Press facts"
      tableColumns={["Topic", "Metric", "Proof point", "Use"]}
      tableRows={[
        { cells: ["Pricing", "2 900 RUB / day", "Hot Desk Boulevard", "market floor"], hot: true },
        { cells: ["Rooms", "32 000 RUB / hour", "Garden Meeting Suite", "premium room"] },
        { cells: ["Offices", "1.46M RUB / month", "Founder Office", "private office"] },
        { cells: ["Network", "10 locations", "Moscow", "coverage"] },
        { cells: ["Product", "Telegram booking", "chat-native flow", "angle"], hot: true },
      ]}
      timelineTitle="Editorial calendar"
      timeline={[
        { period: "May", title: "Moscow inventory launch", body: "Publish the shift from static coworking pages to live Telegram booking." },
        { period: "June", title: "Price index report", body: "Release desk, room, and office floors by location." },
        { period: "July", title: "Operator interviews", body: "Show how venue teams handle live confirmation and receipts." },
      ]}
      note="Press can cite these numbers directly: they match the pricing and office inventory surfaced on the public landing page."
    />
  );
}
