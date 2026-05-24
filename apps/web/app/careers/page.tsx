import { CompanyPage } from "@/components/company-page";

export default function CareersPage() {
  return (
    <CompanyPage
      eyebrow="Careers"
      title="Build the booking layer for physical work."
      intro="Metrix needs people who like practical systems: clean interfaces, reliable operations, and tools that make real buildings easier to use."
      metrics={[
        { value: "4", label: "teams hiring", detail: "Product, operations, design, and partnerships." },
        { value: "10", label: "venues to learn from", detail: "Every role gets close to live workspace operations." },
        { value: "8s", label: "booking target", detail: "The product bar for every user-facing flow." },
        { value: "0", label: "busywork tolerance", detail: "Automate the parts teams should not repeat." },
      ]}
      bars={[
        { label: "Product engineering", value: 88, caption: "Next.js, payments, Telegram flows" },
        { label: "Venue operations", value: 76, caption: "inventory quality and confirmation" },
        { label: "Partnerships", value: 68, caption: "new Moscow locations" },
        { label: "Brand design", value: 55, caption: "data-rich workspace storytelling" },
      ]}
      tableTitle="Open roles"
      tableColumns={["Role", "Team", "Focus", "Location"]}
      tableRows={[
        { cells: ["Product Engineer", "Product", "booking surfaces and dashboards", "Moscow / hybrid"], hot: true },
        { cells: ["Venue Ops Lead", "Operations", "availability quality and SLAs", "Moscow"] },
        { cells: ["Partnership Manager", "Growth", "new locations and pricing", "Moscow"] },
        { cells: ["Product Designer", "Design", "Telegram and web booking UX", "Remote / Moscow"], hot: true },
      ]}
      timelineTitle="Hiring loop"
      timeline={[
        { period: "01", title: "Portfolio and context", body: "We look for evidence of sharp thinking, not keyword density." },
        { period: "02", title: "Working session", body: "A practical discussion around a real booking or operations problem." },
        { period: "03", title: "Offer and first mission", body: "Every hire starts with a concrete improvement to the live network." },
      ]}
      note="The Careers page is intentionally operational: candidates can see the system, the numbers, and the type of work before they apply."
    />
  );
}
