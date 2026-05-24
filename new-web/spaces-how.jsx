/* Metrix — Spaces section + How it works */

const SPACES = [
  {
    id: "desk",
    name: "Hot desk",
    pict: (s) => <PictDesk size={s} />,
    tag: "Drop-in",
    priceFrom: 6,
    blurb: "One seat, all the basics. Fast wi-fi, power, espresso. Book hourly or by the day in a tap.",
    bullets: ["From €6 / hour", "Wi-fi 1 Gbps", "24/7 in select spots", "Pay only for hours used"],
    swatch: "linear-gradient(135deg, #FF5B2E 0%, #FFB39A 100%)",
  },
  {
    id: "meeting",
    name: "Meeting room",
    pict: (s) => <PictMeeting size={s} />,
    tag: "2 — 14 ppl",
    priceFrom: 24,
    blurb: "Glass-walled rooms with 4K screens and whiteboards. Bookable in 15-minute slots.",
    bullets: ["From €24 / hour", "Display + HDMI", "Whiteboards & markers", "Coffee for the table"],
    swatch: "linear-gradient(135deg, #14110D 0%, #5A5247 100%)",
  },
  {
    id: "office",
    name: "Private office",
    pict: (s) => <PictOffice size={s} />,
    tag: "Daily / monthly",
    priceFrom: 89,
    blurb: "A locking door, your team, your time. Choose a single day or rent for the month.",
    bullets: ["From €89 / day", "Door code in chat", "Mail handling", "Daytime reception"],
    swatch: "linear-gradient(135deg, #2C8C5A 0%, #C8E2C2 100%)",
  },
  {
    id: "event",
    name: "Event space",
    pict: (s) => <PictEvent size={s} />,
    tag: "Up to 240",
    priceFrom: 180,
    blurb: "Lofts, studios, rooftops. Host a meetup, demo day or workshop without the spreadsheet.",
    bullets: ["From €180 / hour", "AV crew on demand", "Catering partners", "Liability covered"],
    swatch: "linear-gradient(135deg, #FFD24D 0%, #FFE9A8 100%)",
  },
];

const SpaceTabs = () => {
  const [active, setActive] = React.useState("desk");
  const space = SPACES.find((s) => s.id === active);

  return (
    <section id="spaces">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow tag-dot" style={{ marginBottom: 18 }}>What you can book</div>
            <h2 className="section-title">
              Four kinds of <em>space.</em><br />
              One bot.
            </h2>
          </div>
          <p className="lead" style={{ maxWidth: "40ch" }}>
            From a single hot desk to a 240-person rooftop. Every Metrix venue is vetted, photographed, and bookable in the same eight-second flow.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 28,
          padding: 6, borderRadius: 999,
          background: "var(--bg-2)", border: "1px solid var(--line)",
          width: "fit-content",
        }}>
          {SPACES.map((s) => {
            const on = s.id === active;
            return (
              <button key={s.id} onClick={() => setActive(s.id)} style={{
                padding: "10px 18px", borderRadius: 999,
                background: on ? "var(--ink)" : "transparent",
                color: on ? "var(--bg)" : "var(--ink)",
                fontSize: 14, fontWeight: 500,
                transition: "background .2s, color .2s",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ display: "inline-flex", color: on ? "var(--bg)" : "var(--ink)" }}>
                  {s.pict(20)}
                </span>
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Display panel */}
        <div key={active} style={{
          display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28,
          animation: "float-in .45s ease both",
        }}>
          {/* Big hero card */}
          <div style={{
            position: "relative",
            background: space.swatch,
            borderRadius: 28,
            padding: "44px 44px 36px",
            color: space.id === "meeting" ? "var(--bg)" : "var(--ink)",
            overflow: "hidden",
            minHeight: 460,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            {/* Sticker */}
            <div style={{
              position: "absolute", top: 22, right: 22,
              background: space.id === "meeting" ? "var(--bg)" : "var(--ink)",
              color: space.id === "meeting" ? "var(--ink)" : "var(--bg)",
              padding: "6px 14px", borderRadius: 999,
              fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)" }} />
              {space.tag}
            </div>

            {/* Pictogram */}
            <div style={{ marginBottom: 24 }}>{space.pict(88)}</div>

            {/* Title + blurb + bullets */}
            <div>
              <div className="display" style={{ fontSize: 64, lineHeight: 0.95, marginBottom: 12 }}>
                {space.name}.
              </div>
              <p style={{ fontSize: 17, lineHeight: 1.45, maxWidth: "36ch", margin: "0 0 22px", opacity: 0.85 }}>
                {space.blurb}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {space.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 99, background: "currentColor" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Listing column */}
          <div style={{ display: "grid", gap: 14 }}>
            {[1, 2, 3].map((i) => (
              <SpaceListing key={i} space={space} idx={i} />
            ))}
            <a href="#demo" className="btn btn-ghost" style={{ justifySelf: "start", marginTop: 6, whiteSpace: "nowrap" }}>
              <span>See all {space.name.toLowerCase()}s</span> <Arrow />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const SpaceListing = ({ space, idx }) => {
  const examples = {
    desk: [
      { name: "Mokrym Loft", area: "Kreuzberg, Berlin", price: 18, time: "Open · until 21:00", seats: 12 },
      { name: "Quiet Wing", area: "Mitte, Berlin", price: 12, time: "Open · 24/7", seats: 6 },
      { name: "Brutal Coffee", area: "Friedrichshain", price: 9, time: "Open · until 19:00", seats: 24 },
    ],
    meeting: [
      { name: "Glass Room A", area: "Mitte, Berlin", price: 28, time: "Free now · 90 min", seats: 6 },
      { name: "Board Room", area: "Kreuzberg, Berlin", price: 48, time: "Free 16:30 →", seats: 12 },
      { name: "The Phone Booth", area: "Prenzlauer Berg", price: 14, time: "Free now", seats: 2 },
    ],
    office: [
      { name: "Studio 04", area: "Mitte, Berlin", price: 110, time: "Available tomorrow", seats: 4 },
      { name: "The Annex", area: "Charlottenburg", price: 145, time: "Available today", seats: 8 },
      { name: "Loft 12", area: "Kreuzberg, Berlin", price: 220, time: "From Monday", seats: 14 },
    ],
    event: [
      { name: "Rooftop North", area: "Mitte, Berlin", price: 240, time: "Sat & Sun open", seats: 120 },
      { name: "Black Box", area: "Kreuzberg, Berlin", price: 380, time: "Available Tue →", seats: 240 },
      { name: "The Garden", area: "Treptow, Berlin", price: 195, time: "Summer slots", seats: 80 },
    ],
  }[space.id];

  const e = examples[idx - 1];

  return (
    <div className="card" style={{ padding: 18, display: "flex", gap: 16, alignItems: "center" }}>
      {/* Visual swatch */}
      <div style={{
        width: 80, height: 80, borderRadius: 14,
        background: space.swatch,
        flex: "0 0 80px",
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: space.id === "meeting" ? "var(--bg)" : "var(--ink)",
      }}>
        {space.pict(36)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontFamily: "var(--display)", fontSize: 18, letterSpacing: "-0.01em" }}>{e.name}</strong>
          {idx === 1 && <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 4, fontWeight: 600 }}>hot</span>}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Pin size={12} /> {e.area}</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: "var(--ink-3)" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {e.time}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>{e.seats} seats · verified Sept '26</div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div className="ui-mono-num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em" }}>
          €{e.price}<span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>/hr</span>
        </div>
        <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12, marginTop: 8 }}>
          Book <Arrow size={12} />
        </button>
      </div>
    </div>
  );
};

/* === How it works === */
const HowItWorks = () => {
  const steps = [
    {
      n: "01",
      pict: <PictTelegram size={28} />,
      title: "Open the bot",
      blurb: "Tap @metrix_bot. No app to install, no signup. Telegram already knows who you are.",
    },
    {
      n: "02",
      pict: <Pin size={22} />,
      title: "Tell it where",
      blurb: "Send a city, an address, or your location. Metrix shows what's open right now around you.",
    },
    {
      n: "03",
      pict: <Clock size={22} />,
      title: "Pick a slot",
      blurb: "Tap an hour. Hold a room for 5 minutes while you check. Reschedule any time before check-in.",
    },
    {
      n: "04",
      pict: <CheckDot size={24} color="var(--accent)" />,
      title: "Pay & walk in",
      blurb: "One-tap pay with Apple Pay, Google Pay or card on file. Door code lands in chat. That's it.",
    },
  ];

  return (
    <section id="how" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow tag-dot" style={{ color: "var(--bg)", marginBottom: 18 }}>How it works</div>
            <h2 className="section-title" style={{ color: "var(--bg)" }}>
              From idea to <em>door open</em> in four taps.
            </h2>
          </div>
          <p className="lead" style={{ maxWidth: "38ch", color: "#ffffffb3" }}>
            Built for people who already live in their messenger. Everything happens inside the chat — discovery, payment, the door code, the receipt.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{
              padding: 28,
              borderRadius: 22,
              border: "1px solid #ffffff1a",
              background: i === 0 ? "var(--accent)" : "#ffffff08",
              color: i === 0 ? "var(--accent-ink)" : "var(--bg)",
              position: "relative",
              minHeight: 280,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              transition: "transform .3s ease, background .25s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className="ui-mono-num" style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.04em", opacity: i === 0 ? 1 : 0.8 }}>{s.n}</span>
                <span style={{ opacity: i === 0 ? 1 : 0.75 }}>{s.pict}</span>
              </div>
              <div>
                <div className="display" style={{ fontSize: 28, marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {s.title}
                </div>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.45, opacity: 0.84 }}>{s.blurb}</p>
              </div>
            </div>
          ))}
        </div>

        {/* secondary row: explainer */}
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {[
            { num: "8s", label: "median time to confirm a booking" },
            { num: "0", label: "phone calls. ever." },
            { num: "100%", label: "refundable up to one hour before" },
          ].map((b) => (
            <div key={b.label} style={{ padding: "20px 22px", border: "1px solid #ffffff1a", borderRadius: 16 }}>
              <div className="ui-mono-num" style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.04em", color: "var(--accent)" }}>{b.num}</div>
              <div style={{ fontSize: 14, color: "#ffffffb3", marginTop: 4 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

Object.assign(window, { SpaceTabs, HowItWorks });
