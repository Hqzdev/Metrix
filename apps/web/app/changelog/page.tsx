import { ResourcePage } from "@/components/pages/resource-page";

export default function ChangelogPage() {
  return (
    <ResourcePage
      eyebrow="Changelog"
      title="Product updates with the numbers attached."
      intro="A structured release log for the Metrix web surface, Telegram booking flow, real Moscow pricing, and resource pages."
      metrics={[
        { value: "v.26", label: "current web version" },
        { value: "15", label: "static routes" },
        { value: "10", label: "live locations" },
        { value: "4", label: "company pages added" },
      ]}
      cards={[
        { tag: "May 2026", title: "Moscow pricing refresh", body: "Replaced European demo cities and EUR prices with Moscow locations and RUB inventory." },
        { tag: "May 2026", title: "Company pages", body: "Added About, Press, Careers, and Manifesto with tables, charts, and operating metrics." },
        { tag: "May 2026", title: "Legal pages", body: "Implemented Privacy, Terms, and Imprint as full pages with tables and control visuals." },
        { tag: "May 2026", title: "Header and motion", body: "Made the header a fixed island and kept animations CSS-only after removing scroll-linked motion." },
      ]}
      bars={[
        { label: "Content accuracy", value: 91, caption: "real inventory copy" },
        { label: "Route coverage", value: 88, caption: "footer links implemented" },
        { label: "Build health", value: 100, caption: "Next build passing" },
        { label: "UI polish", value: 82, caption: "spacing and overflow fixes" },
      ]}
      tableTitle="Release log"
      tableColumns={["Version", "Area", "Change", "Impact"]}
      tableRows={[
        { cells: ["v.26.4", "Resources", "FAQ, Status, Changelog, API pages", "footer routes complete"], accent: true },
        { cells: ["v.26.3", "Legal", "Privacy, Terms, Imprint pages", "legal footer complete"] },
        { cells: ["v.26.2", "Company", "About, Press, Careers, Manifesto", "company footer complete"] },
        { cells: ["v.26.1", "Pricing", "Moscow offices and RUB prices", "template data removed"], accent: true },
      ]}
    />
  );
}
