import { BookingMapExplorer } from "@/components/booking/booking-map-explorer";
import { MarketingPageShell } from "@/components/layout/marketing-page-shell";

export default function BookingPage() {
  return (
    <MarketingPageShell
      eyebrow="Booking in Moscow"
      title="Choose a workspace inside one city, then open its floor plan."
      intro="The booking flow now starts with a single-city map of Moscow. Compare Metrix locations by district, demand, and pricing, then open the selected office to inspect desks, rooms, and team zones."
    >
      <BookingMapExplorer />
    </MarketingPageShell>
  );
}
