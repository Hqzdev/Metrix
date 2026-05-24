/* Metrix — B2B + FAQ + Footer */

const B2B = () => (
  <section id="b2b">
    <div className="wrap">
      <div style={{
        position: "relative",
        background: "var(--accent)",
        color: "var(--accent-ink)",
        borderRadius: 32,
        padding: "64px 56px",
        overflow: "hidden",
      }}>
        {/* Decorative pictogram */}
        <div style={{ position: "absolute", right: -80, top: -40, opacity: 0.18, color: "var(--ink)", pointerEvents: "none" }}>
          <PictBuilding size={340} />
        </div>

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 48, alignItems: "flex-end" }}>
          <div>
            <div className="eyebrow tag-dot" style={{ marginBottom: 18 }}>For business</div>
            <h2 className="display" style={{
              fontSize: "clamp(40px, 5.4vw, 80px)",
              letterSpacing: "-0.035em", lineHeight: 0.95, margin: "0 0 22px",
              maxWidth: "16ch",
            }}>
              Turn every city into your <span className="display-italic">office.</span>
            </h2>
            <p className="lead" style={{ color: "var(--ink)", maxWidth: "40ch", marginBottom: 32 }}>
              One invoice. One dashboard. A monthly allowance per teammate, redeemable across 1,248 verified spaces in 14 countries. Set up in 10 minutes.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#" className="btn" style={{ background: "var(--ink)", color: "var(--bg)", padding: "16px 22px", fontSize: 15 }}>
                Book a demo <Arrow />
              </a>
              <a href="#" className="btn btn-ghost" style={{ borderColor: "var(--ink)", color: "var(--ink)", padding: "16px 22px", fontSize: 15 }}>
                Pricing for teams
              </a>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
            {[
              { num: "01", h: "Monthly stipends",  b: "Set a per-seat budget. Unused hours roll over. No haggling, no expense reports." },
              { num: "02", h: "SSO & SCIM",        b: "Provision via Okta, Google, or Azure. Add a teammate and they're in the bot." },
              { num: "03", h: "Real-time receipts", b: "Every booking syncs to Xero, QuickBooks or a CSV — itemized, VAT-split, audit-ready." },
            ].map((item, i) => (
              <div key={item.num} style={{
                padding: "18px 22px", borderRadius: 18,
                background: i === 0 ? "var(--ink)" : "var(--card)",
                color: i === 0 ? "var(--accent)" : "var(--ink)",
                border: i === 0 ? "none" : "1px solid rgba(20,17,13,0.10)",
                transition: "transform .25s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span className="ui-mono-num" style={{ fontSize: 13, opacity: 0.6 }}>{item.num}</span>
                  <strong className="display" style={{ fontSize: 22, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{item.h}</strong>
                </div>
                <p style={{ margin: "8px 0 0 32px", fontSize: 14, lineHeight: 1.45, color: i === 0 ? "#ffffffc4" : "var(--ink-2)" }}>
                  {item.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logos strip */}
      <div style={{ marginTop: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 220 }}>
          Trusted by remote teams at <strong>147 companies</strong> from Series A to public.
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", opacity: 0.7 }}>
          {["ATLAS/CO", "Tundra◇", "Halcyon", "Northbound", "PARSE.fm", "Vellum&Co"].map((n) => (
            <span key={n} style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{n}</span>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const FAQS = [
  {
    q: "Do I need an account?",
    a: "No. The Telegram bot is your account. Open @metrix_bot, send one message, and you're in. We use your Telegram identity for receipts and remember your card so you never re-enter it.",
  },
  {
    q: "What if a space turns out to be busy or closed?",
    a: "Every booking is live-confirmed by the venue within 30 seconds. If we can't confirm, you're auto-refunded and offered the next-closest space at the same hour. We've handled 12,400+ bookings; the no-show rate is 0.18%.",
  },
  {
    q: "Can I cancel or move a booking?",
    a: "Yes. Free cancellation up to 60 minutes before check-in. Within the hour, you keep 50%. Move a booking to a different time, same venue, at any point — even from the door.",
  },
  {
    q: "How does pricing work?",
    a: "You pay the venue's hourly rate plus a 6% Metrix fee. No subscription, no hidden markup. Teams on the Business plan get volume discounts starting at 50 hours / month.",
  },
  {
    q: "Which cities are live?",
    a: "Berlin, Lisbon, Warsaw, Amsterdam, Tbilisi, Barcelona, Paris, Vilnius, Prague, Tallinn, Vienna, Bucharest, Zagreb, and Sofia. We add one new city every three weeks — request yours in the bot.",
  },
  {
    q: "Is there a website to book from?",
    a: "Yes — this one. Use the live booking demo above to reserve right here. But honestly: once you've tried the Telegram flow, you won't come back.",
  },
];

const FAQ = () => {
  const [open, setOpen] = React.useState(0);

  return (
    <section id="faq" style={{ background: "var(--bg-2)" }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow tag-dot" style={{ marginBottom: 18 }}>Questions</div>
            <h2 className="section-title">Common <em>questions.</em></h2>
          </div>
          <p className="lead" style={{ maxWidth: "36ch" }}>
            Still unsure? Send <strong>/help</strong> to the bot. A human picks up within 90 seconds.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10, maxWidth: 920 }}>
          {FAQS.map((f, i) => {
            const isOpen = i === open;
            return (
              <div key={f.q} className="card" style={{
                padding: 0, overflow: "hidden",
                borderColor: isOpen ? "var(--ink)" : "var(--line)",
              }}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "22px 28px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 16, color: "inherit",
                  }}>
                  <span style={{
                    fontFamily: "var(--display)", fontSize: 22, letterSpacing: "-0.02em",
                    fontWeight: 500,
                  }}>
                    <span className="ui-mono-num" style={{ color: "var(--ink-3)", marginRight: 16 }}>0{i + 1}</span>
                    {f.q}
                  </span>
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: isOpen ? "var(--accent)" : "var(--bg-2)",
                    color: "var(--ink)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    transition: "transform .3s, background .2s",
                    transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                    flex: "0 0 32px",
                  }}>
                    <Plus size={16} />
                  </span>
                </button>
                <div style={{
                  maxHeight: isOpen ? 320 : 0,
                  opacity: isOpen ? 1 : 0,
                  transition: "max-height .35s ease, opacity .25s",
                  overflow: "hidden",
                }}>
                  <p style={{
                    margin: 0, padding: "0 28px 26px 76px",
                    fontSize: 16, lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "70ch",
                  }}>
                    {f.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const FooterCTA = () => (
  <section style={{ paddingTop: 80, paddingBottom: 0 }}>
    <div className="wrap">
      <div style={{
        background: "var(--ink)", color: "var(--bg)",
        borderRadius: 36,
        padding: "84px 64px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 40, right: 50, opacity: 0.18 }}>
          <PictBolt size={220} />
        </div>

        <div style={{ position: "relative", maxWidth: "20ch" }}>
          <div className="eyebrow tag-dot" style={{ color: "var(--bg)", marginBottom: 18 }}>Get started</div>
          <h2 className="display" style={{ fontSize: "clamp(48px,6.4vw,108px)", letterSpacing: "-0.045em", lineHeight: 0.92, margin: "0 0 32px" }}>
            Your next desk is <span className="display-italic" style={{ color: "var(--accent)" }}>one</span><br />
            message <span className="display-italic" style={{ color: "var(--accent)" }}>away.</span>
          </h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#" className="btn btn-accent" style={{ padding: "18px 26px", fontSize: 16 }}>
              <PictTelegram size={16} /> Open @metrix_bot <Arrow />
            </a>
            <a href="#" className="btn btn-ghost" style={{ borderColor: "#ffffff40", color: "var(--bg)", padding: "18px 26px", fontSize: 16 }}>
              Get a city demo
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer style={{ padding: "72px 0 40px" }}>
    <div className="wrap">
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 32, marginBottom: 48 }}>
        <div>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>
            <span style={{
              display: "inline-flex", width: 28, height: 28, borderRadius: 8, background: "var(--ink)", color: "var(--bg)",
              alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
            }}>M</span>
            Metrix<span style={{ color: "var(--accent)" }}>.</span>
          </a>
          <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-2)", maxWidth: 280, lineHeight: 1.5 }}>
            Booking workspaces shouldn't feel like booking a flight. Built in Berlin · since 2024.
          </p>
        </div>

        {[
          ["Product", ["Hot desks", "Meeting rooms", "Private offices", "Events"]],
          ["Company", ["About", "Press", "Careers", "Manifesto"]],
          ["Resources", ["FAQ", "Status", "Changelog", "API"]],
          ["Get in touch", ["@metrix_bot", "hello@metrix.app", "Berlin HQ", "Twitter"]],
        ].map(([title, items]) => (
          <div key={title}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{title}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {items.map((i) => (
                <li key={i}><a href="#" style={{ fontSize: 14, color: "var(--ink)", borderBottom: "1px solid transparent" }}
                  onMouseOver={(e) => (e.currentTarget.style.borderBottomColor = "var(--ink)")}
                  onMouseOut={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}>
                  {i}
                </a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <hr className="rule" />

      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--ink-3)" }}>
        <span>© 2026 Metrix Booking GmbH · Berlin</span>
        <span style={{ display: "flex", gap: 18 }}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Imprint</a>
        </span>
      </div>

      {/* Giant wordmark */}
      <div style={{
        marginTop: 60, fontFamily: "var(--display)", fontWeight: 700,
        fontSize: "clamp(120px, 22vw, 360px)", letterSpacing: "-0.06em", lineHeight: 0.85,
        color: "var(--ink)", whiteSpace: "nowrap",
      }}>
        Metrix<span style={{ color: "var(--accent)" }}>.</span>
      </div>
    </div>
  </footer>
);

Object.assign(window, { B2B, FAQ, FooterCTA, Footer });
