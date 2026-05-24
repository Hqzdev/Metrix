import Link from "next/link";
import type { CSSProperties } from "react";

type ResourceMetric = {
  value: string;
  label: string;
};

type ResourceCard = {
  title: string;
  body: string;
  tag: string;
};

type ResourceBar = {
  label: string;
  value: number;
  caption: string;
};

type ResourceRow = {
  cells: string[];
  accent?: boolean;
};

type ResourcePageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  metrics: ResourceMetric[];
  cards: ResourceCard[];
  bars: ResourceBar[];
  tableTitle: string;
  tableColumns: string[];
  tableRows: ResourceRow[];
  codeSample?: string;
};

const navItems = [
  ["FAQ", "/faq"],
  ["Status", "/status"],
  ["Changelog", "/changelog"],
  ["API", "/api"],
];

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

export function ResourcePage({
  eyebrow,
  title,
  intro,
  metrics,
  cards,
  bars,
  tableTitle,
  tableColumns,
  tableRows,
  codeSample,
}: ResourcePageProps) {
  return (
    <main className="metrix-resource-page">
      <header className="metrix-company-nav">
        <Link href="/" className="metrix-logo" aria-label="Metrix home">
          <span>M</span>
          Metrix<b>.</b>
        </Link>
        <nav aria-label="Resource pages">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="metrix-resource-hero">
        <div data-reveal="left">
          <span className="metrix-eyebrow metrix-tag-dot">{eyebrow}</span>
          <h1 className="metrix-display">{title}</h1>
          <p>{intro}</p>
        </div>
        <aside className="metrix-resource-pulse" aria-hidden="true" data-reveal="right" data-delay="120">
          <i />
          <strong>Live</strong>
          <span>Telegram booking surface</span>
        </aside>
      </section>

      <section className="metrix-resource-metrics">
        {metrics.map((metric, index) => (
          <article key={metric.label} data-reveal data-delay={String(index * 70)}>
            <strong className="metrix-num">{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="metrix-resource-grid">
        <div className="metrix-resource-cards">
          {cards.map((card, index) => (
            <article key={card.title} data-reveal="left" data-delay={String(index * 70)}>
              <span>{card.tag}</span>
              <h2>{card.title}</h2>
              <p>{linkBot(card.body)}</p>
            </article>
          ))}
        </div>

        <aside className="metrix-resource-chart" data-reveal="right" data-delay="140">
          <span className="metrix-eyebrow">Signal chart</span>
          {bars.map((bar) => (
            <div key={bar.label}>
              <header>
                <strong>{bar.label}</strong>
                <small>{bar.caption}</small>
              </header>
              <i style={{ "--bar-width": `${bar.value}%` } as CSSProperties}>
                <b />
              </i>
            </div>
          ))}
        </aside>
      </section>

      <section className="metrix-company-table-section metrix-resource-table-section" data-reveal>
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

      {codeSample ? (
        <section className="metrix-resource-code" data-reveal="scale">
          <span className="metrix-eyebrow">Example</span>
          <pre>
            <code>{codeSample}</code>
          </pre>
        </section>
      ) : null}
    </main>
  );
}
