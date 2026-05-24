"use client";

import React, { useEffect, useState } from "react";

type PictProps = {
  size?: number;
  label?: string;
};

type SpaceId = "desk" | "meeting" | "office" | "event";

const Pict = ({ children, size = 56, label }: PictProps & { children: React.ReactNode }) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className="metrix-pict"
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 56 56" width={size} height={size} fill="none">
      {children}
    </svg>
  </span>
);

const PictDesk = ({ size = 56 }: PictProps) => (
  <Pict size={size} label="Hot desk">
    <rect x="6" y="38" width="44" height="3" rx="1.5" fill="currentColor" />
    <rect x="9" y="41" width="3" height="9" rx="1" fill="currentColor" />
    <rect x="44" y="41" width="3" height="9" rx="1" fill="currentColor" />
    <rect x="14" y="16" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2.4" />
    <rect x="22" y="32" width="6" height="6" fill="currentColor" />
    <circle cx="44" cy="22" r="5" fill="var(--metrix-accent)" stroke="currentColor" strokeWidth="2.4" />
    <rect x="42" y="14" width="4" height="4" rx="1" fill="currentColor" />
  </Pict>
);

const PictMeeting = ({ size = 56 }: PictProps) => (
  <Pict size={size} label="Meeting room">
    <rect x="14" y="22" width="28" height="12" rx="3" stroke="currentColor" strokeWidth="2.4" />
    <circle cx="9" cy="18" r="4" fill="currentColor" />
    <circle cx="47" cy="18" r="4" fill="currentColor" />
    <circle cx="9" cy="38" r="4" fill="currentColor" />
    <circle cx="47" cy="38" r="4" fill="currentColor" />
    <circle cx="28" cy="28" r="3" fill="var(--metrix-accent)" />
  </Pict>
);

const PictOffice = ({ size = 56 }: PictProps) => (
  <Pict size={size} label="Private office">
    <rect x="10" y="8" width="36" height="40" rx="2" stroke="currentColor" strokeWidth="2.4" />
    <rect x="18" y="16" width="20" height="28" rx="1.5" fill="currentColor" />
    <circle cx="33" cy="32" r="2.5" fill="var(--metrix-accent)" />
    <rect x="6" y="46" width="44" height="3" rx="1.5" fill="currentColor" />
  </Pict>
);

const PictEvent = ({ size = 56 }: PictProps) => (
  <Pict size={size} label="Event space">
    <rect x="6" y="42" width="44" height="6" rx="1.5" fill="currentColor" />
    <rect x="12" y="28" width="32" height="14" rx="1.5" stroke="currentColor" strokeWidth="2.4" />
    <circle cx="20" cy="35" r="2" fill="currentColor" />
    <circle cx="28" cy="35" r="2" fill="currentColor" />
    <circle cx="36" cy="35" r="2" fill="currentColor" />
    <path d="M16 28 L28 12 L40 28" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="28" cy="20" r="3" fill="var(--metrix-accent)" />
  </Pict>
);

const PictTelegram = ({ size = 18 }: PictProps) => (
  <span className="metrix-pict" style={{ width: size, height: size }} aria-hidden="true">
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path d="M3 11.2L21 4l-3.2 16-5.8-5.4-3.4 3.2 0-4.6L19 6.6 8 12 3 11.2z" fill="currentColor" />
    </svg>
  </span>
);

const Arrow = ({ size = 16 }: PictProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className="metrix-arrow" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckDot = ({ size = 18, color = "var(--metrix-ok)" }: PictProps & { color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Plus = ({ size = 18 }: PictProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Pin = ({ size = 16 }: PictProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
    <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="9" r="2.4" fill="currentColor" />
  </svg>
);

const Clock = ({ size = 16 }: PictProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PictBuilding = ({ size = 56 }: PictProps) => (
  <Pict size={size} label="Building">
    <rect x="10" y="10" width="36" height="40" rx="2" stroke="currentColor" strokeWidth="2.4" />
    <rect x="16" y="16" width="6" height="6" fill="currentColor" />
    <rect x="25" y="16" width="6" height="6" fill="currentColor" />
    <rect x="34" y="16" width="6" height="6" fill="var(--metrix-accent)" />
    <rect x="16" y="25" width="6" height="6" fill="currentColor" />
    <rect x="25" y="25" width="6" height="6" fill="var(--metrix-accent)" />
    <rect x="34" y="25" width="6" height="6" fill="currentColor" />
    <rect x="16" y="34" width="6" height="6" fill="var(--metrix-accent)" />
    <rect x="25" y="34" width="6" height="6" fill="currentColor" />
    <rect x="34" y="34" width="6" height="6" fill="currentColor" />
    <rect x="24" y="43" width="8" height="7" fill="currentColor" />
  </Pict>
);

const PictBolt = ({ size = 56 }: PictProps) => (
  <Pict size={size} label="Fast">
    <path d="M30 6 L14 32 L26 32 L22 50 L42 22 L30 22 L34 6 Z" fill="var(--metrix-accent)" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
  </Pict>
);

const SPACE_OPTIONS = [
  {
    id: "desk" as const,
    name: "Hot desk",
    pict: (size: number) => <PictDesk size={size} />,
    tag: "Drop-in",
    price: 9,
    blurb: "One seat, all the basics. Fast wi-fi, power, espresso. Book hourly or by the day in a tap.",
    bullets: ["From EUR 6 / hour", "Wi-fi 1 Gbps", "24/7 in select spots", "Pay only for hours used"],
    swatch: "linear-gradient(135deg, #FF5B2E 0%, #FFB39A 100%)",
  },
  {
    id: "meeting" as const,
    name: "Meeting room",
    pict: (size: number) => <PictMeeting size={size} />,
    tag: "2-14 ppl",
    price: 28,
    blurb: "Glass-walled rooms with 4K screens and whiteboards. Bookable in 15-minute slots.",
    bullets: ["From EUR 24 / hour", "Display + HDMI", "Whiteboards & markers", "Coffee for the table"],
    swatch: "linear-gradient(135deg, #14110D 0%, #5A5247 100%)",
  },
  {
    id: "office" as const,
    name: "Private office",
    pict: (size: number) => <PictOffice size={size} />,
    tag: "Daily / monthly",
    price: 65,
    blurb: "A locking door, your team, your time. Choose a single day or rent for the month.",
    bullets: ["From EUR 89 / day", "Door code in chat", "Mail handling", "Daytime reception"],
    swatch: "linear-gradient(135deg, #2C8C5A 0%, #C8E2C2 100%)",
  },
  {
    id: "event" as const,
    name: "Event space",
    pict: (size: number) => <PictEvent size={size} />,
    tag: "Up to 240",
    price: 180,
    blurb: "Lofts, studios, rooftops. Host a meetup, demo day or workshop without the spreadsheet.",
    bullets: ["From EUR 180 / hour", "AV crew on demand", "Catering partners", "Liability covered"],
    swatch: "linear-gradient(135deg, #FFD24D 0%, #FFE9A8 100%)",
  },
];

const VENUES: Record<string, [string, string][]> = {
  Berlin: [["Mokrym Loft", "Kreuzberg"], ["Quiet Wing", "Mitte"], ["Brutal Coffee", "Friedrichshain"]],
  Lisbon: [["Amalia Studio", "Alfama"], ["Bairro Hub", "Bairro Alto"], ["Rio Sul", "Cais do Sodre"]],
  Warsaw: [["Praga Atelier", "Praga"], ["Mokotow Wing", "Mokotow"], ["Wola 31", "Wola"]],
  Amsterdam: [["Oost Loft", "Oost"], ["Jordaan Pod", "Jordaan"], ["Noord Atelier", "Noord"]],
  Tbilisi: [["Vake Studio", "Vake"], ["Marjanishvili", "Centre"], ["Saburtalo Pod", "Saburtalo"]],
};

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function Nav({ palette, onTogglePalette }: { palette: "bone" | "ink"; onTogglePalette: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`metrix-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="metrix-nav-inner">
        <a href="#" className="metrix-logo" aria-label="Metrix home">
          <span>M</span>
          Metrix<b>.</b>
        </a>

        <nav className="metrix-nav-links" aria-label="Main navigation">
          {[
            ["Spaces", "#spaces"],
            ["How it works", "#how"],
            ["Book now", "#demo"],
            ["For business", "#b2b"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={label} href={href}>{label}</a>
          ))}
        </nav>

        <div className="metrix-nav-actions">
          <button
            className={`metrix-theme-toggle ${palette === "ink" ? "is-ink" : ""}`}
            onClick={onTogglePalette}
            aria-label={`Switch to ${palette === "bone" ? "Ink" : "Bone"} mode`}
          >
            <span />
          </button>
          <a href="#demo" className="metrix-btn metrix-btn-ghost">Sign in</a>
          <a href="#demo" className="metrix-btn metrix-btn-primary">
            <PictTelegram size={15} /> Open <span>in</span> Telegram
          </a>
        </div>
      </div>
    </header>
  );
}

function ChatPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setStep((current) => (current + 1) % 5), 2400);
    return () => window.clearInterval(interval);
  }, []);

  const Msg = ({ from = "bot", children, accent, visible }: { from?: "bot" | "me"; children: React.ReactNode; accent?: boolean; visible: boolean }) => (
    <div className={`metrix-chat-row ${from === "me" ? "is-me" : ""} ${visible ? "is-visible" : ""}`}>
      <div className={`metrix-chat-msg ${from === "me" ? "is-me" : ""} ${accent ? "is-accent" : ""}`}>{children}</div>
    </div>
  );

  return (
    <div className="metrix-chat-card">
      <div className="metrix-chat-head">
        <div className="metrix-chat-avatar">M</div>
        <div>
          <strong>@metrix_bot</strong>
          <span><i className="metrix-pulse-dot" />online · responds in 2s</span>
        </div>
        <PictTelegram size={18} />
      </div>

      <div className="metrix-chat-body">
        <Msg visible={step >= 0}>
          <strong>Hi! Where do you need a workspace?</strong>
          <small>Tap a city or send your location</small>
        </Msg>
        <Msg visible={step >= 1} from="me">Berlin · today</Msg>
        <Msg visible={step >= 2}>
          <strong>3 spaces near you</strong>
          <div className="metrix-chat-list">
            {[
              ["Kreuzberg loft", "EUR 18 / hr", true],
              ["Mitte focus pod", "EUR 12 / hr", false],
              ["Friedrichshain hub", "EUR 9 / hr", false],
            ].map(([name, price, hot]) => (
              <span key={String(name)}>
                <em><Pin size={11} /> {name}{hot && <b>hot</b>}</em>
                <strong>{price}</strong>
              </span>
            ))}
          </div>
        </Msg>
        <Msg visible={step >= 3} from="me">Kreuzberg loft, 14:00-18:00</Msg>
        <Msg visible={step >= 4} accent>
          <span className="metrix-chat-confirm"><CheckDot size={18} color="var(--metrix-ink)" /> <strong>Booked. EUR 72 paid.</strong></span>
          <small>Door code <b>4421</b> · receipt sent</small>
        </Msg>
      </div>

      <div className="metrix-chat-composer">
        <Plus size={16} />
        <span>Message...</span>
        <b><PictTelegram size={14} /></b>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="metrix-hero">
      <div className="metrix-noise-bg" />
      <div className="metrix-wrap">
        <div className="metrix-hero-kicker">
          <span className="metrix-eyebrow metrix-tag-dot">Booking that lives in chat</span>
          <i />
          <span className="metrix-eyebrow metrix-num">v.26 · 1,248 spaces · 14 cities</span>
        </div>

        <div className="metrix-hero-grid">
          <div>
            <h1 className="metrix-display metrix-hero-title">
              Book a desk<br />
              in <span className="metrix-display-italic">eight seconds.</span><br />
              <span className="metrix-nowrap">
                Right from <mark><PictTelegram size={56} />chat<span>.</span></mark>
              </span>
            </h1>
            <p className="metrix-lead">
              Metrix turns Telegram into your front desk. Find a hot desk, meeting room, or private office, pay in a tap, walk in. No accounts, no calls, no waiting.
            </p>
            <div className="metrix-hero-buttons">
              <a href="#demo" className="metrix-btn metrix-btn-accent"><PictTelegram size={16} /> Open @metrix_bot <Arrow /></a>
              <a href="#spaces" className="metrix-btn metrix-btn-ghost">Browse spaces</a>
            </div>
            <div className="metrix-mini-stats">
              {[
                ["8s", "avg time to book"],
                ["1,248", "verified spaces"],
                ["4.9*", "from 12k bookings"],
              ].map(([num, label]) => (
                <div key={label}>
                  <strong className="metrix-num">{num}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="metrix-hero-preview">
            <div className="metrix-demo-badge"><i className="metrix-pulse-dot" />Live demo</div>
            <ChatPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = ["BERLIN", "LISBON", "WARSAW", "AMSTERDAM", "TBILISI", "BARCELONA", "PARIS", "VILNIUS", "PRAGUE", "TALLINN", "VIENNA", "BUCHAREST", "ZAGREB", "SOFIA"];
  return (
    <div className="metrix-trust-strip">
      <div className="metrix-marquee">
        <div className="metrix-marquee-track">
          {[...items, ...items].map((city, index) => (
            <span key={`${city}-${index}`}><i className={index % 4 === 0 ? "is-accent" : ""} />{city}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpaceTabs() {
  const [active, setActive] = useState<SpaceId>("desk");
  const space = SPACE_OPTIONS.find((item) => item.id === active) ?? SPACE_OPTIONS[0];

  return (
    <section id="spaces" className="metrix-section">
      <div className="metrix-wrap">
        <SectionHead eyebrow="What you can book" title={<>Four kinds of <em>space.</em><br />One bot.</>} lead="From a single hot desk to a 240-person rooftop. Every Metrix venue is vetted, photographed, and bookable in the same eight-second flow." />

        <div className="metrix-tabs" role="tablist" aria-label="Workspace types">
          {SPACE_OPTIONS.map((item) => (
            <button key={item.id} className={item.id === active ? "is-active" : ""} onClick={() => setActive(item.id)}>
              {item.pict(20)} {item.name}
            </button>
          ))}
        </div>

        <div className="metrix-space-panel">
          <div className={`metrix-space-hero is-${space.id}`} style={{ "--space-swatch": space.swatch } as React.CSSProperties}>
            <span className="metrix-space-sticker"><i />{space.tag}</span>
            {space.pict(88)}
            <div>
              <h3 className="metrix-display">{space.name}.</h3>
              <p>{space.blurb}</p>
              <ul>
                {space.bullets.map((bullet) => <li key={bullet}><i />{bullet}</li>)}
              </ul>
            </div>
          </div>

          <div className="metrix-listings">
            {[1, 2, 3].map((idx) => <SpaceListing key={idx} idx={idx} spaceId={space.id} />)}
            <a href="#demo" className="metrix-btn metrix-btn-ghost">See all {space.name.toLowerCase()}s <Arrow /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpaceListing({ spaceId, idx }: { spaceId: SpaceId; idx: number }) {
  const space = SPACE_OPTIONS.find((item) => item.id === spaceId) ?? SPACE_OPTIONS[0];
  const examples: Record<SpaceId, { name: string; area: string; price: number; time: string; seats: number }[]> = {
    desk: [
      { name: "Mokrym Loft", area: "Kreuzberg, Berlin", price: 18, time: "Open · until 21:00", seats: 12 },
      { name: "Quiet Wing", area: "Mitte, Berlin", price: 12, time: "Open · 24/7", seats: 6 },
      { name: "Brutal Coffee", area: "Friedrichshain", price: 9, time: "Open · until 19:00", seats: 24 },
    ],
    meeting: [
      { name: "Glass Room A", area: "Mitte, Berlin", price: 28, time: "Free now · 90 min", seats: 6 },
      { name: "Board Room", area: "Kreuzberg, Berlin", price: 48, time: "Free 16:30 ->", seats: 12 },
      { name: "The Phone Booth", area: "Prenzlauer Berg", price: 14, time: "Free now", seats: 2 },
    ],
    office: [
      { name: "Studio 04", area: "Mitte, Berlin", price: 110, time: "Available tomorrow", seats: 4 },
      { name: "The Annex", area: "Charlottenburg", price: 145, time: "Available today", seats: 8 },
      { name: "Loft 12", area: "Kreuzberg, Berlin", price: 220, time: "From Monday", seats: 14 },
    ],
    event: [
      { name: "Rooftop North", area: "Mitte, Berlin", price: 240, time: "Sat & Sun open", seats: 120 },
      { name: "Black Box", area: "Kreuzberg, Berlin", price: 380, time: "Available Tue ->", seats: 240 },
      { name: "The Garden", area: "Treptow, Berlin", price: 195, time: "Summer slots", seats: 80 },
    ],
  };
  const venue = examples[spaceId][idx - 1];

  return (
    <article className="metrix-card metrix-listing">
      <div className={`metrix-listing-icon is-${spaceId}`} style={{ "--space-swatch": space.swatch } as React.CSSProperties}>{space.pict(36)}</div>
      <div>
        <h3>{venue.name}{idx === 1 && <span>hot</span>}</h3>
        <p><Pin size={12} /> {venue.area}<i /> <Clock size={12} /> {venue.time}</p>
        <small>{venue.seats} seats · verified Sept 2026</small>
      </div>
      <aside>
        <strong className="metrix-num">EUR {venue.price}<small>/hr</small></strong>
        <button className="metrix-btn metrix-btn-primary">Book <Arrow size={12} /></button>
      </aside>
    </article>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", pict: <PictTelegram size={28} />, title: "Open the bot", blurb: "Tap @metrix_bot. No app to install, no signup. Telegram already knows who you are." },
    { n: "02", pict: <Pin size={22} />, title: "Tell it where", blurb: "Send a city, an address, or your location. Metrix shows what's open right now around you." },
    { n: "03", pict: <Clock size={22} />, title: "Pick a slot", blurb: "Tap an hour. Hold a room for 5 minutes while you check. Reschedule any time before check-in." },
    { n: "04", pict: <CheckDot size={24} color="var(--metrix-accent)" />, title: "Pay & walk in", blurb: "One-tap pay with Apple Pay, Google Pay or card on file. Door code lands in chat. That's it." },
  ];

  return (
    <section id="how" className="metrix-section metrix-how">
      <div className="metrix-wrap">
        <SectionHead eyebrow="How it works" title={<>From idea to <em>door open</em> in four taps.</>} lead="Built for people who already live in their messenger. Everything happens inside the chat: discovery, payment, the door code, the receipt." />
        <div className="metrix-step-grid">
          {steps.map((step, index) => (
            <article key={step.n} className={index === 0 ? "is-accent" : ""}>
              <header><strong className="metrix-num">{step.n}</strong>{step.pict}</header>
              <div><h3 className="metrix-display">{step.title}</h3><p>{step.blurb}</p></div>
            </article>
          ))}
        </div>
        <div className="metrix-proof-grid">
          {[
            ["8s", "median time to confirm a booking"],
            ["0", "phone calls. ever."],
            ["100%", "refundable up to one hour before"],
          ].map(([num, label]) => (
            <div key={label}><strong className="metrix-num">{num}</strong><span>{label}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingDemo() {
  const [city, setCity] = useState("Berlin");
  const [spaceId, setSpaceId] = useState<SpaceId>("desk");
  const [venueIdx, setVenueIdx] = useState(0);
  const [startIdx, setStartIdx] = useState(2);
  const [hours, setHours] = useState(3);
  const [people, setPeople] = useState(1);
  const [extras, setExtras] = useState({ coffee: false, parking: false, screen: true });
  const [confirmed, setConfirmed] = useState(false);

  const space = SPACE_OPTIONS.find((item) => item.id === spaceId) ?? SPACE_OPTIONS[0];
  const venue = VENUES[city][venueIdx];
  const subtotal = space.price * hours;
  const extrasCost = (extras.coffee ? 3 * hours : 0) + (extras.parking ? 4 : 0);
  const fee = Math.round((subtotal + extrasCost) * 0.06);
  const total = subtotal + extrasCost + fee;
  const startHour = HOURS[startIdx];
  const endHour = HOURS[Math.min(startIdx + hours, HOURS.length - 1)] ?? "20:00";

  useEffect(() => setVenueIdx(0), [city]);
  useEffect(() => setConfirmed(false), [city, spaceId, venueIdx, startIdx, hours, people, extras]);

  return (
    <section id="demo" className="metrix-section metrix-demo">
      <div className="metrix-wrap">
        <SectionHead eyebrow="Live booking" title={<>Try the bot, <em>right here.</em></>} lead="Play with the real booking surface. Every change updates the price calculator and the Telegram preview in real time. No card required." />
        <div className="metrix-demo-grid">
          <div className="metrix-card metrix-booking-surface">
            <Field label="01  Where">
              <div className="metrix-chip-row">{Object.keys(VENUES).map((item) => <Chip key={item} on={item === city} onClick={() => setCity(item)}><Pin size={12} /> {item}</Chip>)}</div>
            </Field>
            <Field label="02  What">
              <div className="metrix-space-options">
                {SPACE_OPTIONS.map((item) => (
                  <button key={item.id} className={item.id === spaceId ? "is-active" : ""} onClick={() => setSpaceId(item.id)}>
                    {item.pict(28)}<span>{item.name}</span><small>from EUR {item.price}/hr</small>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="03  Which" hint={`${VENUES[city].length} venues open in ${city}`}>
              <div className="metrix-venue-list">
                {VENUES[city].map((item, index) => (
                  <button key={item[0]} className={index === venueIdx ? "is-active" : ""} onClick={() => setVenueIdx(index)}>
                    <i /><strong>{item[0]}</strong><span>{item[1]}</span>{index === 0 && <b>hot</b>}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="04  When" hint={`Today · ${startHour} -> ${endHour}`}>
              <div className="metrix-hours">{HOURS.map((hour, index) => <button key={hour} className={index === startIdx ? "is-start" : index > startIdx && index < startIdx + hours ? "is-range" : ""} onClick={() => setStartIdx(index)}>{hour}</button>)}</div>
              <div className="metrix-duration"><span>Duration</span>{[1, 2, 3, 4, 6, 8].map((item) => <Chip key={item} small on={item === hours} onClick={() => setHours(item)}>{item}h</Chip>)}</div>
            </Field>
            <Field label="05  Extras">
              <div className="metrix-chip-row">
                <div className="metrix-people">
                  <span>People</span>
                  <button onClick={() => setPeople(Math.max(1, people - 1))}>-</button>
                  <strong className="metrix-num">{people}</strong>
                  <button onClick={() => setPeople(people + 1)}>+</button>
                </div>
                <Chip on={extras.coffee} onClick={() => setExtras((current) => ({ ...current, coffee: !current.coffee }))}>Coffee EUR 3/hr</Chip>
                <Chip on={extras.parking} onClick={() => setExtras((current) => ({ ...current, parking: !current.parking }))}>Parking EUR 4</Chip>
                {(spaceId === "meeting" || spaceId === "office") && <Chip on={extras.screen} onClick={() => setExtras((current) => ({ ...current, screen: !current.screen }))}>4K screen · free</Chip>}
              </div>
            </Field>
          </div>

          <aside className="metrix-receipt-stack">
            <div className="metrix-card metrix-receipt">
              <header>
                <div><span className="metrix-eyebrow">Receipt</span><h3 className="metrix-display">{venue[0]}</h3><p>{venue[1]}, {city}</p></div>
                {space.pict(40)}
              </header>
              <ReceiptRow label={`${space.name} · ${hours}h x EUR ${space.price}`} value={`EUR ${subtotal}`} />
              {extras.coffee && <ReceiptRow label={`Coffee · ${hours}h x EUR 3`} value={`EUR ${3 * hours}`} />}
              {extras.parking && <ReceiptRow label="Parking" value="EUR 4" />}
              <ReceiptRow label="Service fee" value={`EUR ${fee}`} muted />
              <hr />
              <div className="metrix-total"><span>Total · {hours}h</span><strong className="metrix-num">EUR {total}</strong></div>
              <button onClick={() => setConfirmed(true)} className={`metrix-btn ${confirmed ? "is-confirmed" : ""}`}>
                {confirmed ? <><CheckDot color="var(--metrix-ink)" /> Booked!</> : <><PictTelegram size={16} /> Confirm via Telegram <Arrow /></>}
              </button>
              <small>Free cancellation up to 1 hour before · No card needed today</small>
            </div>
            <div className="metrix-card metrix-chat-snippet">
              <span className="metrix-eyebrow">What you'll see in chat</span>
              {confirmed ? (
                <p className="is-confirmed"><CheckDot color="var(--metrix-ink)" size={16} /> <strong>Booking confirmed</strong><br />{venue[0]} · {startHour}-{endHour} · EUR {total} paid<br />Door code <b>{1000 + (subtotal * 7) % 9000}</b></p>
              ) : (
                <p>Holding <strong>{venue[0]}</strong> for you · {startHour} &gt; {endHour}<br /><span>Confirm within 5 minutes</span></p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function B2B() {
  return (
    <section id="b2b" className="metrix-section">
      <div className="metrix-wrap">
        <div className="metrix-b2b-panel">
          <div className="metrix-b2b-mark"><PictBuilding size={340} /></div>
          <div className="metrix-b2b-grid">
            <div>
              <div className="metrix-eyebrow metrix-tag-dot">For business</div>
              <h2 className="metrix-display">Turn every city into your <span className="metrix-display-italic">office.</span></h2>
              <p className="metrix-lead">One invoice. One dashboard. A monthly allowance per teammate, redeemable across 1,248 verified spaces in 14 countries. Set up in 10 minutes.</p>
              <div className="metrix-hero-buttons"><a href="#demo" className="metrix-btn metrix-btn-primary">Book a demo <Arrow /></a><a href="#demo" className="metrix-btn metrix-btn-ghost">Pricing for teams</a></div>
            </div>
            <div className="metrix-b2b-features">
              {[
                ["01", "Monthly stipends", "Set a per-seat budget. Unused hours roll over. No haggling, no expense reports."],
                ["02", "SSO & SCIM", "Provision via Okta, Google, or Azure. Add a teammate and they're in the bot."],
                ["03", "Real-time receipts", "Every booking syncs to Xero, QuickBooks or a CSV: itemized, VAT-split, audit-ready."],
              ].map(([num, title, text], index) => (
                <article key={num} className={index === 0 ? "is-dark" : ""}><h3><span className="metrix-num">{num}</span>{title}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </div>
        <div className="metrix-logo-strip">
          <p>Trusted by remote teams at <strong>147 companies</strong> from Series A to public.</p>
          {["ATLAS/CO", "Tundra", "Halcyon", "Northbound", "PARSE.fm", "Vellum&Co"].map((name) => <span key={name}>{name}</span>)}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  const faqs = [
    ["Do I need an account?", "No. The Telegram bot is your account. Open @metrix_bot, send one message, and you're in. We use your Telegram identity for receipts and remember your card so you never re-enter it."],
    ["What if a space turns out to be busy or closed?", "Every booking is live-confirmed by the venue within 30 seconds. If we can't confirm, you're auto-refunded and offered the next-closest space at the same hour."],
    ["Can I cancel or move a booking?", "Yes. Free cancellation up to 60 minutes before check-in. Within the hour, you keep 50%. Move a booking to a different time, same venue, at any point."],
    ["How does pricing work?", "You pay the venue's hourly rate plus a 6% Metrix fee. No subscription, no hidden markup. Teams on the Business plan get volume discounts starting at 50 hours / month."],
    ["Which cities are live?", "Berlin, Lisbon, Warsaw, Amsterdam, Tbilisi, Barcelona, Paris, Vilnius, Prague, Tallinn, Vienna, Bucharest, Zagreb, and Sofia."],
    ["Is there a website to book from?", "Yes, this one. Use the live booking demo above to reserve right here. But once you've tried the Telegram flow, you probably won't come back."],
  ];

  return (
    <section id="faq" className="metrix-section metrix-faq">
      <div className="metrix-wrap">
        <SectionHead eyebrow="Questions" title={<>Common <em>questions.</em></>} lead={<>Still unsure? Send <strong>/help</strong> to the bot. A human picks up within 90 seconds.</>} />
        <div className="metrix-faq-list">
          {faqs.map(([question, answer], index) => (
            <article key={question} className={`metrix-card ${open === index ? "is-open" : ""}`}>
              <button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>
                <span><b className="metrix-num">0{index + 1}</b>{question}</span>
                <i><Plus size={16} /></i>
              </button>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section className="metrix-footer-cta-section">
      <div className="metrix-wrap">
        <div className="metrix-footer-cta">
          <div className="metrix-footer-bolt"><PictBolt size={220} /></div>
          <span className="metrix-eyebrow metrix-tag-dot">Get started</span>
          <h2 className="metrix-display">Your next desk is <span className="metrix-display-italic">one</span><br />message <span className="metrix-display-italic">away.</span></h2>
          <div className="metrix-hero-buttons"><a href="#demo" className="metrix-btn metrix-btn-accent"><PictTelegram size={16} /> Open @metrix_bot <Arrow /></a><a href="#demo" className="metrix-btn metrix-btn-ghost">Get a city demo</a></div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const groups: Array<[string, string[]]> = [
    ["Product", ["Hot desks", "Meeting rooms", "Private offices", "Events"]],
    ["Company", ["About", "Press", "Careers", "Manifesto"]],
    ["Resources", ["FAQ", "Status", "Changelog", "API"]],
    ["Get in touch", ["@metrix_bot", "hello@metrix.app", "Berlin HQ", "Twitter"]],
  ];
  return (
    <footer className="metrix-footer">
      <div className="metrix-wrap">
        <div className="metrix-footer-grid">
          <div>
            <a href="#" className="metrix-logo"><span>M</span>Metrix<b>.</b></a>
            <p>Booking workspaces shouldn't feel like booking a flight. Built in Berlin · since 2024.</p>
          </div>
          {groups.map(([title, items]) => (
            <nav key={title} aria-label={title}>
              <h3 className="metrix-eyebrow">{title}</h3>
              {items.map((item) => <a key={item} href="#">{item}</a>)}
            </nav>
          ))}
        </div>
        <hr className="metrix-rule" />
        <div className="metrix-footer-bottom"><span>© 2026 Metrix Booking GmbH · Berlin</span><span><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Imprint</a></span></div>
        <div className="metrix-wordmark">Metrix<span>.</span></div>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: React.ReactNode; lead: React.ReactNode }) {
  return (
    <div className="metrix-section-head">
      <div><div className="metrix-eyebrow metrix-tag-dot">{eyebrow}</div><h2 className="metrix-section-title">{title}</h2></div>
      <p className="metrix-lead">{lead}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="metrix-field">
      <header><span className="metrix-num">{label}</span>{hint && <small>{hint}</small>}</header>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return <button className={`metrix-chip ${on ? "is-active" : ""} ${small ? "is-small" : ""}`} onClick={onClick}>{children}</button>;
}

function ReceiptRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return <div className={`metrix-receipt-row ${muted ? "is-muted" : ""}`}><span>{label}</span><strong className="metrix-num">{value}</strong></div>;
}

function applyPalette(palette: "bone" | "ink") {
  const vars = palette === "ink"
    ? {
        "--metrix-bg": "#0E0C09",
        "--metrix-bg-2": "#171410",
        "--metrix-bg-3": "#221E18",
        "--metrix-ink": "#F2EFE8",
        "--metrix-ink-2": "#B7AE9F",
        "--metrix-ink-3": "#867C6D",
        "--metrix-line": "#ffffff14",
        "--metrix-line-2": "#ffffff2a",
        "--metrix-card": "#171410",
        "--metrix-accent-2": "#3a1f15",
        "--metrix-accent-ink": "#0E0C09",
      }
    : {
        "--metrix-bg": "#F2EFE8",
        "--metrix-bg-2": "#ECE7DC",
        "--metrix-bg-3": "#E3DDCF",
        "--metrix-ink": "#14110D",
        "--metrix-ink-2": "#5A5247",
        "--metrix-ink-3": "#8C8170",
        "--metrix-line": "#1411091a",
        "--metrix-line-2": "#14110933",
        "--metrix-card": "#FFFDF7",
        "--metrix-accent-2": "#FFE4D6",
        "--metrix-accent-ink": "#14110D",
      };
  Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
}

export function MetrixLanding() {
  const [palette, setPalette] = useState<"bone" | "ink">("bone");

  useEffect(() => {
    applyPalette(palette);
    document.body.classList.remove("no-italic-headlines");
  }, [palette]);

  const togglePalette = () => setPalette((current) => (current === "bone" ? "ink" : "bone"));

  return (
    <main className="metrix-site">
      <Nav palette={palette} onTogglePalette={togglePalette} />
      <Hero />
      <TrustStrip />
      <SpaceTabs />
      <HowItWorks />
      <BookingDemo />
      <B2B />
      <FAQ />
      <FooterCTA />
      <Footer />
    </main>
  );
}
