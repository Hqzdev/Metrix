import type { CSSProperties } from "react";
import { MetrixFooter, MetrixHeader } from "@/components/metrix-shell";

type LegalMetric = {
  value: string;
  label: string;
};

type LegalSection = {
  title: string;
  body: string;
  meta: string;
};

type LegalTableRow = {
  cells: string[];
  accent?: boolean;
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  metrics: LegalMetric[];
  sections: LegalSection[];
  tableTitle: string;
  tableColumns: string[];
  tableRows: LegalTableRow[];
};

function linkBot(text: string) {
  const handle = "@metritxsxbot";
  if (!text.includes(handle)) {
    return text;
  }

  const parts = text.split(handle);
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <a href="https://t.me/metritxsxbot" target="_blank" rel="noreferrer">
              {handle}
            </a>
          ) : null}
        </span>
      ))}
    </>
  );
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  metrics,
  sections,
  tableTitle,
  tableColumns,
  tableRows,
}: LegalPageProps) {
  return (
    <main className="metrix-site metrix-legal-page">
      <MetrixHeader />

      <section className="metrix-legal-hero metrix-wrap">
        <div data-reveal="left">
          <span className="metrix-eyebrow metrix-tag-dot">{eyebrow}</span>
          <h1 className="metrix-display">{title}</h1>
          <p>{intro}</p>
        </div>
        <aside data-reveal="right" data-delay="120">
          <span>Last updated</span>
          <strong>{updated}</strong>
          <p>Legal text for the Moscow Telegram booking experience, written for users and venue operators.</p>
        </aside>
      </section>

      <section className="metrix-legal-metrics metrix-wrap" aria-label="Legal summary">
        {metrics.map((metric, index) => (
          <article key={metric.label} data-reveal data-delay={String(index * 70)}>
            <strong className="metrix-num">{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="metrix-legal-layout metrix-wrap">
        <div className="metrix-legal-sections">
          {sections.map((section, index) => (
            <article key={section.title} data-reveal="left" data-delay={String(index * 70)}>
              <span className="metrix-num">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{linkBot(section.body)}</p>
                <small>{section.meta}</small>
              </div>
            </article>
          ))}
        </div>

        <aside className="metrix-legal-chart" data-reveal="right" data-delay="120">
          <span className="metrix-eyebrow">Control map</span>
          <div>
            {sections.slice(0, 5).map((section, index) => (
              <i key={section.title} style={{ "--slice": `${36 + index * 12}%` } as CSSProperties}>
                <b>{String(index + 1).padStart(2, "0")}</b>
              </i>
            ))}
          </div>
        </aside>
      </section>

      <section className="metrix-company-table-section metrix-legal-table-section metrix-wrap" data-reveal>
        <div>
          <span className="metrix-eyebrow">Reference table</span>
          <h2>{tableTitle}</h2>
        </div>
        <div className="metrix-company-table-wrap">
          <table className="metrix-company-table">
            <thead>
              <tr>
                {tableColumns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.cells.join("-")} className={row.accent ? "is-hot" : undefined}>
                  {row.cells.map((cell) => (
                    <td key={cell}>{linkBot(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <MetrixFooter />
    </main>
  );
}
