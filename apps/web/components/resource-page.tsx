import type { CSSProperties } from "react";
import { MetrixFooter, MetrixHeader } from "@/components/metrix-shell";

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
    <main className="metrix-site metrix-resource-page">
      <MetrixHeader />

      <section className="metrix-resource-hero metrix-wrap">
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

      <section className="metrix-resource-metrics metrix-wrap">
        {metrics.map((metric, index) => (
          <article key={metric.label} data-reveal data-delay={String(index * 70)}>
            <strong className="metrix-num">{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="metrix-resource-grid metrix-wrap">
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

      <section className="metrix-company-table-section metrix-resource-table-section metrix-wrap" data-reveal>
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
        <section className="metrix-resource-code metrix-wrap" data-reveal="scale">
          <span className="metrix-eyebrow">Example</span>
          <pre>
            <code>{codeSample}</code>
          </pre>
        </section>
      ) : null}
      <MetrixFooter />
    </main>
  );
}
