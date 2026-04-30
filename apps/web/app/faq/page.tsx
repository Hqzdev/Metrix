import { MarketingPageShell } from "@/components/marketing-page-shell";

const faqs = [
  {
    question: "Can I book a desk for one day only?",
    answer: "Yes. Metrix supports flexible day access for people who need workspace without a monthly commitment.",
  },
  {
    question: "Do you offer private offices for teams?",
    answer: "Yes. Private offices are available for small and growing teams that need privacy with shared amenities around them.",
  },
  {
    question: "Are meeting rooms included?",
    answer: "Meeting rooms can be booked separately or bundled depending on the membership level and location.",
  },
  {
    question: "Can I move between locations?",
    answer: "Selected plans include cross-location access so members can work closer to clients, home, or their team schedule.",
  },
];

export default function FaqPage() {
  return (
    <MarketingPageShell
      eyebrow="FAQ"
      title="Questions teams ask before they switch to a better workspace."
      intro="The basics on desk access, offices, rooms, and how Metrix keeps coworking flexible without making it feel temporary."
    >
      <div className="grid gap-6">
        {faqs.map((item) => (
          <div key={item.question} className="border border-border p-8">
            <h2 className="text-xl font-medium tracking-tight">{item.question}</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  );
}
