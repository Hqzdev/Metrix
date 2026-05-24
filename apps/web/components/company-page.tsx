import Link from "next/link";
import type { CSSProperties } from "react";

type Metric = {
  value: string;
  label: string;
  detail: string;
};

type Bar = {
  label: string;
  value: number;
  caption: string;
};

type TableRow = {
  cells: string[];
  hot?: boolean;
};

type TimelineItem = {
  period: string;
  title: string;
  body: string;
};

type CompanyPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  metrics: Metric[];
  bars: Bar[];
  tableTitle: string;
  tableColumns: string[];
  tableRows: TableRow[];
  timelineTitle: string;
  timeline: TimelineItem[];
  note: string;
};

const navItems = [
  ["About", "/about"],
  ["Press", "/press"],
  ["Careers", "/careers"],
  ["Manifesto", "/manifesto"],
];

export function CompanyPage({
  eyebrow,
  title,
  intro,
  metrics,
  bars,
  tableTitle,
  tableColumns,
  tableRows,
  timelineTitle,
  timeline,
  note,
}: CompanyPageProps) {
  return (
    <main className="metrix-company-page">
      <header className="metrix-company-nav">
        <Link href="/" className="metrix-logo" aria-label="Metrix home">
          <span>M</span>
          Metrix<b>.</b>
        </Link>
        <nav aria-label="Company pages">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="metrix-company-hero">
        <div data-reveal="left">
          <span className="metrix-eyebrow metrix-tag-dot">{eyebrow}</span>
          <h1 className="metrix-display">{title}</h1>
          <p>{intro}</p>
        </div>
        <div className="metrix-company-radar" aria-hidden="true" data-reveal="right" data-delay="120">
          <i />
          <i />
          <i />
          <strong>10</strong>
          <span>Moscow locations</span>
        </div>
      </section>

      <section className="metrix-company-metrics" aria-label="Company metrics">
        {metrics.map((metric, index) => (
          <article key={metric.label} data-reveal data-delay={String(index * 70)}>
            <strong className="metrix-num">{metric.value}</strong>
            <span>{metric.label}</span>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="metrix-company-grid">
        <article className="metrix-company-chart" data-reveal="left">
          <header>
            <span className="metrix-eyebrow">Operating graph</span>
            <h2>Live network signal</h2>
          </header>
          <div className="metrix-bars">
            {bars.map((bar) => (
              <div key={bar.label}>
                <div>
                  <strong>{bar.label}</strong>
                  <span>{bar.caption}</span>
                </div>
                <i style={{ "--bar-width": `${bar.value}%` } as CSSProperties}>
                  <b />
                </i>
              </div>
            ))}
          </div>
        </article>

        <article className="metrix-company-timeline" data-reveal="right" data-delay="120">
          <header>
            <span className="metrix-eyebrow">Roadmap</span>
            <h2>{timelineTitle}</h2>
          </header>
          {timeline.map((item) => (
            <div key={item.period}>
              <time>{item.period}</time>
              <section>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </section>
            </div>
          ))}
        </article>
      </section>

      <section className="metrix-company-table-section" data-reveal>
        <div>
          <span className="metrix-eyebrow">Data table</span>
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
                <tr key={row.cells.join("-")} className={row.hot ? "is-hot" : undefined}>
                  {row.cells.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="metrix-company-note" data-reveal="scale">
        <p>{note}</p>
        <Link href="/#demo" className="metrix-btn metrix-btn-primary">
          Open booking demo
        </Link>
      </aside>
    </main>
  );
}
