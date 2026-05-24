import Link from "next/link";
import type { CSSProperties } from "react";
import { Arrow, MetrixFooter, MetrixHeader } from "@/components/metrix-shell";

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
  variant: "about" | "press" | "careers" | "manifesto";
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

export function CompanyPage({
  variant,
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
    <main className={`metrix-site metrix-company-page is-${variant}`}>
      <MetrixHeader />

      <section className="metrix-company-hero metrix-wrap">
        <div data-reveal="left">
          <span className="metrix-eyebrow metrix-tag-dot">{eyebrow}</span>
          <h1 className="metrix-display">{title}</h1>
          <p>{intro}</p>
        </div>
        <CompanyVisual variant={variant} metrics={metrics} bars={bars} />
      </section>

      <section className="metrix-company-metrics metrix-wrap" aria-label="Company metrics">
        {metrics.map((metric, index) => (
          <article key={metric.label} data-reveal data-delay={String(index * 70)}>
            <strong className="metrix-num">{metric.value}</strong>
            <span>{metric.label}</span>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="metrix-company-grid metrix-wrap">
        <article className={`metrix-company-chart metrix-chart-${variant}`} data-reveal={variant === "press" ? "right" : "left"}>
          <header>
            <span className="metrix-eyebrow">{variant === "careers" ? "Team graph" : variant === "manifesto" ? "Belief graph" : "Operating graph"}</span>
            <h2>{variant === "press" ? "Media signal mix" : variant === "careers" ? "Hiring focus map" : variant === "manifesto" ? "Principle strength" : "Live network signal"}</h2>
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

        <article className="metrix-company-timeline" data-reveal={variant === "press" ? "left" : "right"} data-delay="120">
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

      <section className={`metrix-company-table-section metrix-company-table-${variant} metrix-wrap`} data-reveal>
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

      <aside className="metrix-company-note metrix-wrap" data-reveal="scale">
        <p>{note}</p>
        <Link href="/#demo" className="metrix-btn metrix-btn-primary">
          Open booking demo <Arrow />
        </Link>
      </aside>
      <MetrixFooter />
    </main>
  );
}

function CompanyVisual({ variant, metrics, bars }: { variant: CompanyPageProps["variant"]; metrics: Metric[]; bars: Bar[] }) {
  if (variant === "press") {
    return (
      <div className="metrix-company-visual metrix-company-press-card" aria-hidden="true" data-reveal="right" data-delay="120">
        <span className="metrix-eyebrow">Press kit</span>
        <strong>{metrics[0]?.value}</strong>
        <p>{metrics[0]?.label}</p>
        <div>
          {bars.slice(0, 3).map((bar) => (
            <i key={bar.label} style={{ "--bar-width": `${bar.value}%` } as CSSProperties}><b /></i>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "careers") {
    return (
      <div className="metrix-company-visual metrix-company-role-card" aria-hidden="true" data-reveal="right" data-delay="120">
        {bars.map((bar, index) => (
          <span key={bar.label} style={{ "--role-size": `${58 + index * 18}px` } as CSSProperties}>
            {bar.label.split(" ")[0]}
          </span>
        ))}
      </div>
    );
  }

  if (variant === "manifesto") {
    return (
      <div className="metrix-company-visual metrix-company-principle-card" aria-hidden="true" data-reveal="right" data-delay="120">
        {bars.map((bar) => (
          <section key={bar.label}>
            <strong>{bar.label}</strong>
            <i style={{ "--bar-width": `${bar.value}%` } as CSSProperties} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="metrix-company-visual metrix-company-radar" aria-hidden="true" data-reveal="right" data-delay="120">
      <i />
      <i />
      <i />
      <strong>10</strong>
      <span>Moscow locations</span>
    </div>
  );
}
