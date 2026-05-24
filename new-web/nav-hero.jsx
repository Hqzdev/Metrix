/* Metrix — Nav + Hero */

const Nav = ({ palette, onTogglePalette }) => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navStyle = {
    position: "sticky", top: 0, zIndex: 40,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    background: scrolled ? "rgba(242,239,232,0.78)" : "transparent",
    borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
    transition: "background .25s, border-color .25s",
  };

  return (
    <div style={navStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", maxWidth: 1320, margin: "0 auto", gap: 16 }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", flexShrink: 0 }}>
          <span style={{
            display: "inline-flex", width: 28, height: 28, borderRadius: 8, background: "var(--ink)", color: "var(--bg)",
            alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "var(--display)"
          }}>
            M
          </span>
          Metrix<span style={{ color: "var(--accent)" }}>.</span>
        </a>

        <nav style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 14, color: "var(--ink-2)", flexShrink: 0 }}>
          {[
            ["Spaces", "#spaces"],
            ["How it works", "#how"],
            ["Book now", "#demo"],
            ["For business", "#b2b"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={label} href={href} style={{ padding: "8px 12px", borderRadius: 999, transition: "background .2s, color .2s", whiteSpace: "nowrap" }}
               onMouseOver={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "var(--bg)"; }}
               onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-2)"; }}>
              {label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={onTogglePalette} aria-label="Toggle theme" title={`Switch to ${palette === "bone" ? "Ink" : "Bone"} mode`} style={{
            width: 38, height: 38, borderRadius: "50%",
            border: "1px solid var(--line-2)",
            background: "var(--bg)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "transform .35s cubic-bezier(.2,.7,.2,1), background .2s, border-color .2s",
            flexShrink: 0,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.borderColor = "var(--ink)"; e.currentTarget.querySelector('.tg-disk').style.background = "var(--accent)"; }}
          onMouseOut={(e) => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.borderColor = "var(--line-2)"; e.currentTarget.querySelector('.tg-disk').style.background = palette === "ink" ? "var(--bg)" : "var(--ink)"; }}
          >
            <span className="tg-disk" style={{
              display: "inline-block",
              width: 18, height: 18, borderRadius: "50%",
              background: palette === "ink" ? "var(--bg)" : "var(--ink)",
              boxShadow: palette === "ink"
                ? "inset -6px -2px 0 0 var(--bg-2)"
                : "inset -6px -2px 0 0 var(--ink-2)",
              transition: "background .25s, box-shadow .25s, transform .4s",
              transform: palette === "ink" ? "rotate(180deg)" : "rotate(0)",
            }} />
          </button>
          <a href="#demo" className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 14, whiteSpace: "nowrap" }}>Sign in</a>
          <a href="#demo" className="btn btn-primary" style={{ padding: "10px 14px", fontSize: 14, whiteSpace: "nowrap" }}>
            <PictTelegram size={15} /> Open <span style={{ opacity: 0.7 }}>in</span> Telegram
          </a>
        </div>
      </div>
    </div>
  );
};

/* === Hero — animated Telegram chat preview === */
const ChatPreview = () => {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 5), 2400);
    return () => clearInterval(t);
  }, []);

  const Msg = ({ from = "bot", children, accent, visible }) => (
    <div style={{
      display: "flex", justifyContent: from === "me" ? "flex-end" : "flex-start",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity .45s ease, transform .45s ease",
    }}>
      <div style={{
        maxWidth: "82%",
        padding: "10px 14px",
        borderRadius: from === "me" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: from === "me" ? "var(--accent)" : "var(--bg-3)",
        color: from === "me" ? "var(--accent-ink)" : "var(--ink)",
        fontSize: 14.5, lineHeight: 1.35,
        fontWeight: 500,
        border: from === "me" ? "none" : "1px solid var(--line)",
        boxShadow: accent ? "0 8px 28px -12px rgba(255,91,46,.45)" : "none",
      }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="card" style={{
      padding: 0,
      borderRadius: 28,
      overflow: "hidden",
      width: "100%",
      maxWidth: 420,
      transform: "rotate(1.4deg)",
      boxShadow: "0 40px 80px -40px rgba(20,17,13,.35)",
    }}>
      {/* Telegram chat header */}
      <div style={{
        padding: "14px 18px",
        background: "var(--ink)",
        color: "var(--bg)",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid #ffffff14",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "var(--accent)", color: "var(--accent-ink)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--display)", fontWeight: 700, fontSize: 16,
        }}>M</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>@metrix_bot</div>
          <div style={{ fontSize: 11.5, color: "#ffffff80", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#5ee08a" }}></span>
            online · responds in 2s
          </div>
        </div>
        <PictTelegram size={18} />
      </div>

      <div style={{
        padding: "18px 16px",
        display: "grid", gap: 10,
        background: "var(--card)",
        minHeight: 360,
      }}>
        <Msg visible={step >= 0}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>👋 Hi! Where do you need a workspace?</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Tap a city or send your location</div>
        </Msg>

        <Msg visible={step >= 1} from="me">Berlin · today</Msg>

        <Msg visible={step >= 2}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>3 spaces near you</div>
          <div style={{ display: "grid", gap: 6 }}>
            {[
              ["Kreuzberg loft", "€18 / hr", true],
              ["Mitte focus pod", "€12 / hr", false],
              ["Friedrichshain hub", "€9 / hr", false],
            ].map(([name, price, hot]) => (
              <div key={name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: 12.5, padding: "6px 10px",
                background: "var(--bg)", borderRadius: 8,
              }}>
                <span>
                  <Pin size={11} /> &nbsp;{name}
                  {hot && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 4, fontWeight: 600 }}>hot</span>}
                </span>
                <strong className="ui-mono-num">{price}</strong>
              </div>
            ))}
          </div>
        </Msg>

        <Msg visible={step >= 3} from="me">Kreuzberg loft, 14:00 — 18:00</Msg>

        <Msg visible={step >= 4} accent>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <CheckDot size={18} color="var(--ink)" />
            <strong>Booked. €72 paid.</strong>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink)" }}>
            Door code <span className="ui-mono-num" style={{ background: "var(--ink)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>4421</span> · receipt sent
          </div>
        </Msg>

        {/* Typing indicator slot */}
        <div style={{ height: 4 }}></div>
      </div>

      {/* Composer */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid var(--line)",
        background: "var(--bg-2)",
        display: "flex", alignItems: "center", gap: 10,
        fontSize: 13, color: "var(--ink-3)",
      }}>
        <Plus size={16} />
        <span style={{ flex: 1 }}>Message…</span>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: "var(--tg)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <PictTelegram size={14} />
        </div>
      </div>
    </div>
  );
};

const Hero = () => (
  <section style={{ paddingTop: 60, paddingBottom: 120, position: "relative" }}>
    <div className="noise-bg" />
    <div className="wrap" style={{ position: "relative" }}>

      {/* Eyebrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36, flexWrap: "wrap" }}>
        <span className="eyebrow tag-dot">Booking that lives in chat</span>
        <span style={{ flex: 1, minWidth: 40, height: 1, background: "var(--line-2)" }} />
        <span className="eyebrow ui-mono-num" style={{ whiteSpace: "nowrap" }}>v.26 · 1,248 spaces · 14 cities</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40, alignItems: "center" }}>
        {/* Left: headline */}
        <div>
          <h1 className="display" style={{
            fontSize: "clamp(56px, 8.4vw, 132px)",
            margin: "0 0 28px",
            letterSpacing: "-0.045em",
            lineHeight: 0.9,
          }}>
            Book a desk<br/>
            in <span className="display-italic" style={{ color: "var(--accent)" }}>eight seconds.</span><br/>
            <span style={{ whiteSpace: "nowrap" }}>
              Right from <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.12em",
                background: "var(--ink)", color: "var(--bg)",
                padding: "0.04em 0.22em 0.1em",
                borderRadius: "0.16em",
                verticalAlign: "baseline",
              }}>
                <PictTelegram size={56} />
                chat<span style={{ color: "var(--accent)" }}>.</span>
              </span>
            </span>
          </h1>

          <p className="lead" style={{ marginBottom: 36, maxWidth: "44ch" }}>
            Metrix turns Telegram into your front desk. Find a hot desk, meeting room, or private office, pay in a tap, walk in. No accounts, no calls, no waiting.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
            <a href="#demo" className="btn btn-accent" style={{ padding: "16px 22px", fontSize: 16 }}>
              <PictTelegram size={16} /> Open @metrix_bot <Arrow />
            </a>
            <a href="#spaces" className="btn btn-ghost" style={{ padding: "16px 22px", fontSize: 16 }}>
              Browse spaces
            </a>
          </div>

          {/* Mini stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 520 }}>
            {[
              ["8s", "avg time to book"],
              ["1,248", "verified spaces"],
              ["4.9★", "from 12k bookings"],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="ui-mono-num" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.04em" }}>{num}</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat preview */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
          {/* Decorative ticker behind chat */}
          <div style={{
            position: "absolute", inset: -30, borderRadius: 36,
            background: "var(--accent)",
            transform: "rotate(-2deg)",
            filter: "blur(2px)",
            opacity: 0.14,
            zIndex: 0,
          }} />
          <div style={{
            position: "absolute", top: -16, left: -10,
            transform: "rotate(-6deg)",
            background: "var(--accent)", color: "var(--accent-ink)",
            padding: "6px 14px", borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
            zIndex: 3,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 24px -8px rgba(20,17,13,.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink)" }} />
            Live demo
          </div>

          <div style={{ position: "relative", zIndex: 1, width: "100%", display:"flex", justifyContent:"center" }}>
            <ChatPreview />
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* === Trusted-by marquee strip === */
const TrustStrip = () => {
  const items = [
    "BERLIN", "LISBON", "WARSAW", "AMSTERDAM", "TBILISI",
    "BARCELONA", "PARIS", "VILNIUS", "PRAGUE", "TALLINN",
    "VIENNA", "BUCHAREST", "ZAGREB", "SOFIA",
  ];
  const all = [...items, ...items];
  return (
    <div style={{
      borderTop: "1px solid var(--line)",
      borderBottom: "1px solid var(--line)",
      background: "var(--bg-2)",
      padding: "22px 0",
    }}>
      <div className="marquee">
        <div className="marquee-track">
          {all.map((c, i) => (
            <span key={i} style={{
              fontFamily: "var(--display)",
              fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em",
              color: "var(--ink)",
              display: "inline-flex", alignItems: "center", gap: 48,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: i % 4 === 0 ? "var(--accent)" : "var(--ink)" }} />
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Nav, Hero, TrustStrip });
