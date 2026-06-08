"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  Building03Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Desk02Icon,
  Location01Icon,
  MeetingRoomIcon,
  OfficeIcon,
  PlusSignIcon,
  TeamWorkIcon,
  TelegramIcon,
} from "@hugeicons/core-free-icons";
import { MetrixFooter, MetrixHeader } from "@/components/layout/metrix-shell";
import { CountUpNumber } from "@/components/metrics/count-up-number";

type PictProps = {
  size?: number;
  label?: string;
};

type SpaceId = "desk" | "meeting" | "office" | "event";
type VenueOption = {
  name: string;
  area: string;
  price: number;
  unit: string;
  seats: string;
};

const Pict = ({ icon, size = 56, label, className }: PictProps & { icon: IconSvgElement; className?: string }) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className={`metrix-pict ${className ?? ""}`}
    style={{ width: size, height: size }}
  >
    <HugeiconsIcon icon={icon} size={size} strokeWidth={1.8} />
  </span>
);

const PictDesk = ({ size = 56 }: PictProps) => <Pict icon={Desk02Icon} size={size} label="Hot desk" />;
const PictMeeting = ({ size = 56 }: PictProps) => <Pict icon={MeetingRoomIcon} size={size} label="Meeting room" />;
const PictOffice = ({ size = 56 }: PictProps) => <Pict icon={OfficeIcon} size={size} label="Private office" />;
const PictEvent = ({ size = 56 }: PictProps) => <Pict icon={TeamWorkIcon} size={size} label="Team pod" />;
const PictTelegram = ({ size = 18 }: PictProps) => <Pict icon={TelegramIcon} size={size} />;
const PictBuilding = ({ size = 56 }: PictProps) => <Pict icon={Building03Icon} size={size} label="Building" />;
const Arrow = ({ size = 16 }: PictProps) => <HugeiconsIcon icon={ArrowRight02Icon} size={size} strokeWidth={2} className="metrix-arrow" aria-hidden="true" />;
const CheckDot = ({ size = 18, color = "var(--metrix-ok)" }: PictProps & { color?: string }) => <HugeiconsIcon icon={CheckmarkCircle02Icon} size={size} strokeWidth={2} color={color} aria-hidden="true" />;
const Plus = ({ size = 18 }: PictProps) => <HugeiconsIcon icon={PlusSignIcon} size={size} strokeWidth={2} aria-hidden="true" />;
const Pin = ({ size = 16 }: PictProps) => <HugeiconsIcon icon={Location01Icon} size={size} strokeWidth={2} aria-hidden="true" />;
const Clock = ({ size = 16 }: PictProps) => <HugeiconsIcon icon={Clock01Icon} size={size} strokeWidth={2} aria-hidden="true" />;

const SPACE_OPTIONS = [
  {
    id: "desk" as const,
    name: "Hot desk",
    pict: (size: number) => <PictDesk size={size} />,
    tag: "Drop-in",
    price: 3400,
    unit: "day",
    blurb: "One seat, all the basics. Fast wi-fi, power, espresso. Book a daily desk at Patriarchy or Belorusskaya in a tap.",
    bullets: ["From 2 900 RUB / day", "Library Desks from 39 000 RUB / desk / month", "Wi-fi 1 Gbps", "Pay only for the slot used"],
    swatch: "linear-gradient(135deg, #FF5B2E 0%, #FFB39A 100%)",
  },
  {
    id: "meeting" as const,
    name: "Meeting room",
    pict: (size: number) => <PictMeeting size={size} />,
    tag: "2-14 ppl",
    price: 27000,
    unit: "hour",
    blurb: "Glass-walled rooms with 4K screens and whiteboards. Book real Moscow rooms in 15-minute slots.",
    bullets: ["From 27 000 RUB / hour", "Garden Meeting Suite 32 000 RUB / hour", "Display + HDMI", "Coffee for the table"],
    swatch: "linear-gradient(135deg, #14110D 0%, #5A5247 100%)",
  },
  {
    id: "office" as const,
    name: "Private office",
    pict: (size: number) => <PictOffice size={size} />,
    tag: "Daily / monthly",
    price: 1080000,
    unit: "month",
    blurb: "A locking door, your team, your time. Choose real private offices across Moscow locations.",
    bullets: ["From 1 080 000 RUB / month", "Founder Office 1 460 000 RUB / month", "Door code in chat", "Daytime reception"],
    swatch: "linear-gradient(135deg, #2C8C5A 0%, #C8E2C2 100%)",
  },
  {
    id: "event" as const,
    name: "Team pod",
    pict: (size: number) => <PictEvent size={size} />,
    tag: "Teams",
    price: 33000,
    unit: "desk / month",
    blurb: "Dedicated team zones for launches, client sprints, and growing teams without the spreadsheet.",
    bullets: ["Launch Pad from 33 000 RUB / desk / month", "Editorial Studio 36 000 RUB / desk / month", "10-16 desks", "One monthly invoice"],
    swatch: "linear-gradient(135deg, #FFD24D 0%, #FFE9A8 100%)",
  },
];

const VENUES: Record<string, VenueOption[]> = {
  Patriarchy: [
    { name: "Courtyard Bench", area: "18 Malaya Bronnaya Street", price: 3400, unit: "day", seats: "14 desks" },
    { name: "Library Desks", area: "18 Malaya Bronnaya Street", price: 39000, unit: "desk / month", seats: "12 desks" },
    { name: "Garden Meeting Suite", area: "18 Malaya Bronnaya Street", price: 32000, unit: "hour", seats: "8 seats" },
  ],
  Belorusskaya: [
    { name: "Hot Desk Boulevard", area: "34 Lesnaya Street", price: 2900, unit: "day", seats: "18 desks" },
    { name: "Rail Meeting Room", area: "34 Lesnaya Street", price: 27000, unit: "hour", seats: "12 seats" },
    { name: "Launch Pad", area: "34 Lesnaya Street", price: 33000, unit: "desk / month", seats: "16 desks" },
  ],
  Paveletskaya: [
    { name: "Dockline Desks", area: "5 Letnikovskaya Street", price: 3100, unit: "day", seats: "20 desks" },
    { name: "Investor Room", area: "5 Letnikovskaya Street", price: 31000, unit: "hour", seats: "10 seats" },
    { name: "Build Room", area: "5 Letnikovskaya Street", price: 198000, unit: "month", seats: "9 seats" },
  ],
  "Moscow City": [
    { name: "Skyline Room 6", area: "12 Presnenskaya Embankment", price: 2100, unit: "hour", seats: "3 seats" },
    { name: "Summit Room 9", area: "12 Presnenskaya Embankment", price: 2550, unit: "hour", seats: "12 seats" },
    { name: "Transit Room 7", area: "12 Presnenskaya Embankment", price: 2250, unit: "hour", seats: "5 seats" },
  ],
  Kurskaya: [
    { name: "Focus Room 1", area: "11 Zemlyanoy Val", price: 1350, unit: "hour", seats: "2 seats" },
    { name: "Board Room 2", area: "11 Zemlyanoy Val", price: 1500, unit: "hour", seats: "4 seats" },
    { name: "Studio Room 3", area: "11 Zemlyanoy Val", price: 1650, unit: "hour", seats: "6 seats" },
  ],
  "Park Kultury": [
    { name: "Garden Room 4", area: "21 Zubovsky Boulevard", price: 1800, unit: "hour", seats: "8 seats" },
    { name: "Library Room 5", area: "21 Zubovsky Boulevard", price: 1950, unit: "hour", seats: "10 seats" },
    { name: "Skyline Room 6", area: "21 Zubovsky Boulevard", price: 2100, unit: "hour", seats: "3 seats" },
  ],
  Tverskaya: [
    { name: "Transit Room 7", area: "7 Tverskaya Street", price: 2250, unit: "hour", seats: "5 seats" },
    { name: "Atrium Room 8", area: "7 Tverskaya Street", price: 2400, unit: "hour", seats: "7 seats" },
    { name: "Summit Room 9", area: "7 Tverskaya Street", price: 2550, unit: "hour", seats: "12 seats" },
  ],
  "Chistye Prudy": [
    { name: "Courtyard Room 10", area: "19 Myasnitskaya Street", price: 2700, unit: "hour", seats: "1 desk" },
    { name: "Focus Room 1", area: "19 Myasnitskaya Street", price: 1350, unit: "hour", seats: "2 seats" },
    { name: "Board Room 2", area: "19 Myasnitskaya Street", price: 1500, unit: "hour", seats: "4 seats" },
  ],
  Taganskaya: [
    { name: "Studio Room 3", area: "3 Taganskaya Square", price: 1650, unit: "hour", seats: "6 seats" },
    { name: "Garden Room 4", area: "3 Taganskaya Square", price: 1800, unit: "hour", seats: "8 seats" },
    { name: "Library Room 5", area: "3 Taganskaya Square", price: 1950, unit: "hour", seats: "10 seats" },
  ],
  Sokol: [
    { name: "Skyline Room 6", area: "14 Leningradsky Avenue", price: 2100, unit: "hour", seats: "3 seats" },
    { name: "Transit Room 7", area: "14 Leningradsky Avenue", price: 2250, unit: "hour", seats: "5 seats" },
    { name: "Atrium Room 8", area: "14 Leningradsky Avenue", price: 2400, unit: "hour", seats: "7 seats" },
  ],
};

const BOOKING_VENUES: Record<string, Record<SpaceId, VenueOption[]>> = {
  Patriarchy: {
    desk: [
      { name: "Courtyard Bench", area: "18 Malaya Bronnaya Street", price: 3400, unit: "day", seats: "14 desks" },
      { name: "Library Desks", area: "18 Malaya Bronnaya Street", price: 39000, unit: "desk / month", seats: "12 desks" },
    ],
    meeting: [
      { name: "Garden Meeting Suite", area: "18 Malaya Bronnaya Street", price: 32000, unit: "hour", seats: "8 seats" },
      { name: "Investor Room", area: "18 Malaya Bronnaya Street", price: 31000, unit: "hour", seats: "10 seats" },
    ],
    office: [
      { name: "Founder Office", area: "18 Malaya Bronnaya Street", price: 1460000, unit: "month", seats: "6 seats" },
      { name: "Editorial Office", area: "18 Malaya Bronnaya Street", price: 1210000, unit: "month", seats: "5 seats" },
    ],
    event: [
      { name: "Editorial Studio", area: "18 Malaya Bronnaya Street", price: 36000, unit: "desk / month", seats: "10 desks" },
      { name: "Garden Pod", area: "18 Malaya Bronnaya Street", price: 35500, unit: "desk / month", seats: "12 desks" },
    ],
  },
  Belorusskaya: {
    desk: [
      { name: "Hot Desk Boulevard", area: "34 Lesnaya Street", price: 2900, unit: "day", seats: "18 desks" },
      { name: "Quiet Desk Row", area: "34 Lesnaya Street", price: 3150, unit: "day", seats: "16 desks" },
    ],
    meeting: [
      { name: "Rail Meeting Room", area: "34 Lesnaya Street", price: 27000, unit: "hour", seats: "12 seats" },
      { name: "North Briefing Room", area: "34 Lesnaya Street", price: 28500, unit: "hour", seats: "8 seats" },
    ],
    office: [
      { name: "Transit Office", area: "34 Lesnaya Street", price: 1080000, unit: "month", seats: "4 seats" },
      { name: "Signal Office", area: "34 Lesnaya Street", price: 1160000, unit: "month", seats: "5 seats" },
    ],
    event: [
      { name: "Launch Pad", area: "34 Lesnaya Street", price: 33000, unit: "desk / month", seats: "16 desks" },
      { name: "North Team Pod", area: "34 Lesnaya Street", price: 34000, unit: "desk / month", seats: "14 desks" },
    ],
  },
  Paveletskaya: {
    desk: [
      { name: "Dockline Desks", area: "5 Letnikovskaya Street", price: 3100, unit: "day", seats: "20 desks" },
      { name: "Riverside Bench", area: "5 Letnikovskaya Street", price: 3350, unit: "day", seats: "12 desks" },
    ],
    meeting: [
      { name: "Investor Room", area: "5 Letnikovskaya Street", price: 31000, unit: "hour", seats: "10 seats" },
      { name: "Build Room", area: "5 Letnikovskaya Street", price: 29500, unit: "hour", seats: "9 seats" },
    ],
    office: [
      { name: "Bridge Office", area: "5 Letnikovskaya Street", price: 1390000, unit: "month", seats: "5 seats" },
      { name: "Build Office", area: "5 Letnikovskaya Street", price: 1280000, unit: "month", seats: "6 seats" },
    ],
    event: [
      { name: "Riverside Pod", area: "5 Letnikovskaya Street", price: 36500, unit: "desk / month", seats: "10 desks" },
      { name: "Dockline Pod", area: "5 Letnikovskaya Street", price: 35000, unit: "desk / month", seats: "12 desks" },
    ],
  },
  "Moscow City": {
    desk: [{ name: "Tower Desk", area: "12 Presnenskaya Embankment", price: 4200, unit: "day", seats: "22 desks" }],
    meeting: [{ name: "Summit Room 9", area: "12 Presnenskaya Embankment", price: 25500, unit: "hour", seats: "12 seats" }],
    office: [{ name: "North Tower Office", area: "12 Presnenskaya Embankment", price: 1620000, unit: "month", seats: "7 seats" }],
    event: [{ name: "Skyline Pod", area: "12 Presnenskaya Embankment", price: 41000, unit: "desk / month", seats: "14 desks" }],
  },
  Kurskaya: {
    desk: [{ name: "Focus Desk Row", area: "11 Zemlyanoy Val", price: 3000, unit: "day", seats: "16 desks" }],
    meeting: [{ name: "Focus Room 1", area: "11 Zemlyanoy Val", price: 27000, unit: "hour", seats: "6 seats" }],
    office: [{ name: "Ring Office", area: "11 Zemlyanoy Val", price: 1180000, unit: "month", seats: "5 seats" }],
    event: [{ name: "Sprint Pod", area: "11 Zemlyanoy Val", price: 33500, unit: "desk / month", seats: "10 desks" }],
  },
  "Park Kultury": {
    desk: [{ name: "Garden Desk", area: "21 Zubovsky Boulevard", price: 3300, unit: "day", seats: "14 desks" }],
    meeting: [{ name: "Garden Room 4", area: "21 Zubovsky Boulevard", price: 28000, unit: "hour", seats: "8 seats" }],
    office: [{ name: "Boulevard Office", area: "21 Zubovsky Boulevard", price: 1240000, unit: "month", seats: "5 seats" }],
    event: [{ name: "Culture Pod", area: "21 Zubovsky Boulevard", price: 35000, unit: "desk / month", seats: "12 desks" }],
  },
  Tverskaya: {
    desk: [{ name: "Central Desk", area: "7 Tverskaya Street", price: 3600, unit: "day", seats: "18 desks" }],
    meeting: [{ name: "Atrium Room 8", area: "7 Tverskaya Street", price: 30000, unit: "hour", seats: "7 seats" }],
    office: [{ name: "Central Office", area: "7 Tverskaya Street", price: 1510000, unit: "month", seats: "6 seats" }],
    event: [{ name: "Atrium Pod", area: "7 Tverskaya Street", price: 39000, unit: "desk / month", seats: "12 desks" }],
  },
  "Chistye Prudy": {
    desk: [{ name: "Courtyard Desk", area: "19 Myasnitskaya Street", price: 3200, unit: "day", seats: "14 desks" }],
    meeting: [{ name: "Courtyard Room 10", area: "19 Myasnitskaya Street", price: 27000, unit: "hour", seats: "10 seats" }],
    office: [{ name: "Courtyard Office", area: "19 Myasnitskaya Street", price: 1320000, unit: "month", seats: "5 seats" }],
    event: [{ name: "Courtyard Pod", area: "19 Myasnitskaya Street", price: 36000, unit: "desk / month", seats: "10 desks" }],
  },
  Taganskaya: {
    desk: [{ name: "Square Desk", area: "3 Taganskaya Square", price: 3050, unit: "day", seats: "16 desks" }],
    meeting: [{ name: "Studio Room 3", area: "3 Taganskaya Square", price: 27500, unit: "hour", seats: "6 seats" }],
    office: [{ name: "Square Office", area: "3 Taganskaya Square", price: 1150000, unit: "month", seats: "4 seats" }],
    event: [{ name: "Studio Pod", area: "3 Taganskaya Square", price: 33500, unit: "desk / month", seats: "10 desks" }],
  },
  Sokol: {
    desk: [{ name: "Avenue Desk", area: "14 Leningradsky Avenue", price: 2950, unit: "day", seats: "18 desks" }],
    meeting: [{ name: "Transit Room 7", area: "14 Leningradsky Avenue", price: 27000, unit: "hour", seats: "7 seats" }],
    office: [{ name: "Avenue Office", area: "14 Leningradsky Avenue", price: 1090000, unit: "month", seats: "4 seats" }],
    event: [{ name: "Avenue Pod", area: "14 Leningradsky Avenue", price: 33000, unit: "desk / month", seats: "10 desks" }],
  },
};

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const TELEGRAM_BOT_URL = "https://t.me/metritxsxbot";
const BotHandle = () => <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">@metritxsxbot</a>;

const formatRub = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} RUB`;
const priceLabel = (price: number, unit: string) => `${formatRub(price)} / ${unit}`;
const formatRubShort = (value: number) => {
  if (value >= 1000000) {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value / 1000000)}M RUB`;
  }

  if (value >= 100000) {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value / 1000)}K RUB`;
  }

  return formatRub(value);
};
const priceLabelShort = (price: number, unit: string) => `${formatRubShort(price)} / ${unit}`;

function ChatPreview() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timings = [0, 600, 1000, 1400, 2000, 2600, 3000, 3600, 4200, 4600, 5200, 6100, 6500, 7100];
    let timers: number[] = [];

    const run = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
      setStep(0);
      timings.forEach((time, index) => {
        timers.push(window.setTimeout(() => setStep(index + 1), time));
      });
    };

    run();
    const interval = window.setInterval(run, 8000);

    return () => {
      window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const Msg = ({ from = "bot", children, accent, visible }: { from?: "bot" | "me"; children: React.ReactNode; accent?: boolean; visible: boolean }) => (
    <div className={`metrix-chat-row ${from === "me" ? "is-me" : ""} ${visible ? "is-visible" : ""}`}>
      <div className={`metrix-chat-msg ${from === "me" ? "is-me" : ""} ${accent ? "is-accent" : ""}`}>{children}</div>
    </div>
  );
  const Typing = ({ visible }: { visible: boolean }) => (
    <div className={`metrix-chat-row metrix-chat-typing ${visible ? "is-visible" : ""}`} aria-hidden="true">
      <div className="metrix-chat-msg">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
  const showMessage = (index: number) => step >= index + 1;
  const showTyping = (index: number) => step === index + 1;

  return (
    <div className="metrix-chat-card">
      <div className="metrix-chat-head">
        <div className="metrix-chat-avatar">
          <Image src="/icons/app-icon-light.png" alt="" width={38} height={38} />
        </div>
        <div>
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer"><strong>@metritxsxbot</strong></a>
          <span><i className="metrix-pulse-dot" />online · responds in 2s</span>
        </div>
        <PictTelegram size={18} />
      </div>

      <div className="metrix-chat-body">
        {showTyping(0) && <Typing visible />}
        {showMessage(1) && (
          <Msg visible>
            <strong>Hi! Where do you need a workspace?</strong>
            <small>Tap a Moscow location or send your address</small>
          </Msg>
        )}
        {showMessage(2) && <Msg visible from="me">Patriarchy · today</Msg>}
        {showTyping(3) && <Typing visible />}
        {showMessage(4) && (
          <Msg visible>
            <strong>3 spaces near you</strong>
            <div className="metrix-chat-list">
              {[
                ["Courtyard Bench", "3 400 RUB / day", true],
                ["Garden Meeting Suite", "32 000 RUB / hour", false],
                ["Library Desks", "39 000 RUB / desk / month", false],
              ].map(([name, price, hot]) => (
                <span key={String(name)}>
                  <em><Pin size={11} /> {name}{hot && <b>hot</b>}</em>
                  <strong>{price}</strong>
                </span>
              ))}
            </div>
          </Msg>
        )}
        {showMessage(5) && <Msg visible from="me">Courtyard Bench, 14:00-18:00</Msg>}
        {showTyping(6) && <Typing visible />}
        {showMessage(7) && (
          <Msg visible accent>
            <span className="metrix-chat-confirm"><CheckDot size={18} color="var(--metrix-ink)" /> <strong>Booked. 3 604 RUB paid.</strong></span>
            <small>Door code <b>4421</b> · receipt sent</small>
          </Msg>
        )}
        {showMessage(8) && <Msg visible from="me">Tverskaya</Msg>}
        {showTyping(9) && <Typing visible />}
        {showMessage(10) && (
          <Msg visible>
            Found 3 spaces near Tverskaya. Hot desk from 2 900 ₽ — available now.
          </Msg>
        )}
        {showMessage(11) && <Msg visible from="me">Hot desk, today 10:00</Msg>}
        {showTyping(12) && <Typing visible />}
        {showMessage(13) && (
          <Msg visible accent>
            Holding for you · Confirm within 5 min ✓
          </Msg>
        )}
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
          <span className="metrix-eyebrow metrix-num">v.26 · 10 Moscow locations · RUB pricing</span>
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
              No app. No account. No phone calls. Find a desk in Moscow, pay in Telegram, walk straight in.
            </p>
            <div className="metrix-hero-buttons">
              <a href={TELEGRAM_BOT_URL} className="metrix-btn metrix-btn-accent" target="_blank" rel="noreferrer"><PictTelegram size={16} /> Open @metritxsxbot <Arrow /></a>
              <a href="#spaces" className="metrix-btn metrix-btn-ghost">Browse spaces</a>
            </div>
            <div className="metrix-mini-stats">
              {[
                { num: "8s", label: "avg time to book", startValue: 0 },
                { num: "10", label: "Moscow locations", startValue: 0 },
                { num: "2 900", label: "RUB daily desks from", startValue: 2800 },
              ].map(({ num, label, startValue }) => (
                <div key={label}>
                  <strong className="metrix-num">
                    <CountUpNumber value={num} startValue={startValue} />
                  </strong>
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
  const items = ["PATRIARCHY", "BELORUSSKAYA", "PAVELETSKAYA", "MOSCOW CITY", "KURSKAYA", "PARK KULTURY", "TVERSKAYA", "CHISTYE PRUDY", "TAGANSKAYA", "SOKOL"];
  return (
    <div className="metrix-trust-strip" data-reveal>
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
        <SectionHead eyebrow="What you can book" title={<>Real Moscow <strong>spaces.</strong><br />One bot.</>} lead="From a single hot desk to a meeting suite or a monthly team pod. Every Metrix venue uses the same live prices from the booking inventory." />

        <div className="metrix-tabs" role="tablist" aria-label="Workspace types" data-reveal data-delay="80">
          {SPACE_OPTIONS.map((item) => (
            <button key={item.id} className={item.id === active ? "is-active" : ""} onClick={() => setActive(item.id)}>
              {item.pict(20)} {item.name}
            </button>
          ))}
        </div>

        <div className="metrix-space-panel">
          <div className={`metrix-space-hero is-${space.id}`} style={{ "--space-swatch": space.swatch } as React.CSSProperties} data-reveal="left">
            <span className="metrix-space-sticker"><i />{space.tag}</span>
            {space.pict(88)}
            <div>
              <h3 className="metrix-display">{space.name}.</h3>
              <p>{space.blurb}</p>
              {space.id === "desk" ? (
                <div className="metrix-space-live">
                  <strong className="metrix-num">from 2 900 RUB / day</strong>
                  <p>· Fast Wi-Fi&nbsp;&nbsp; · Power outlets&nbsp;&nbsp; · Espresso bar</p>
                  <span>18 desks available today</span>
                  <a href="#demo">See all locations <Arrow size={14} /></a>
                </div>
              ) : (
                <ul>
                  {space.bullets.map((bullet) => <li key={bullet}><i />{bullet}</li>)}
                </ul>
              )}
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
  const examples: Record<SpaceId, { name: string; area: string; price: number; unit: string; time: string; seats: string }[]> = {
    desk: [
      { name: "Hot Desk Boulevard", area: "Belorusskaya · 34 Lesnaya Street", price: 2900, unit: "day", time: "Open · until 21:00", seats: "18 desks" },
      { name: "Dockline Desks", area: "Paveletskaya · 5 Letnikovskaya Street", price: 3100, unit: "day", time: "Open · 24/7", seats: "20 desks" },
      { name: "Courtyard Bench", area: "Patriarchy · 18 Malaya Bronnaya Street", price: 3400, unit: "day", time: "Best same-day option", seats: "14 desks" },
    ],
    meeting: [
      { name: "Rail Meeting Room", area: "Belorusskaya · 34 Lesnaya Street", price: 27000, unit: "hour", time: "Free now · 90 min", seats: "12 seats" },
      { name: "Investor Room", area: "Paveletskaya · 5 Letnikovskaya Street", price: 31000, unit: "hour", time: "Free 16:30 ->", seats: "10 seats" },
      { name: "Garden Meeting Suite", area: "Patriarchy · 18 Malaya Bronnaya Street", price: 32000, unit: "hour", time: "Open after 14:00", seats: "8 seats" },
    ],
    office: [
      { name: "Transit Office", area: "Belorusskaya · 34 Lesnaya Street", price: 1080000, unit: "month", time: "Available now", seats: "4 seats" },
      { name: "Bridge Office", area: "Paveletskaya · 5 Letnikovskaya Street", price: 1390000, unit: "month", time: "Available today", seats: "5 seats" },
      { name: "Founder Office", area: "Patriarchy · 18 Malaya Bronnaya Street", price: 1460000, unit: "month", time: "Available now", seats: "6 seats" },
    ],
    event: [
      { name: "Launch Pad", area: "Belorusskaya · 34 Lesnaya Street", price: 33000, unit: "desk / month", time: "7 desks open", seats: "16 desks" },
      { name: "Editorial Studio", area: "Patriarchy · 18 Malaya Bronnaya Street", price: 36000, unit: "desk / month", time: "High demand", seats: "10 desks" },
      { name: "Riverside Pod", area: "Paveletskaya · 5 Letnikovskaya Street", price: 36500, unit: "desk / month", time: "2 desks open", seats: "10 desks" },
    ],
  };
  const venue = examples[spaceId][idx - 1];

  return (
    <article className="metrix-card metrix-listing" data-reveal data-delay={String((idx - 1) * 100)}>
      <div className={`metrix-listing-icon is-${spaceId}`} style={{ "--space-swatch": space.swatch } as React.CSSProperties}>{space.pict(36)}</div>
      <div>
        <h3>{venue.name}{idx === 1 && <span>hot</span>}</h3>
        <p><Pin size={12} /> {venue.area}<i /> <Clock size={12} /> {venue.time}</p>
        <small>{venue.seats} · verified May 2026</small>
      </div>
      <aside>
        <strong className="metrix-num"><span>{formatRubShort(venue.price)}</span><small>/ {venue.unit}</small></strong>
        <button className="metrix-btn metrix-btn-primary">Book <Arrow size={12} /></button>
      </aside>
    </article>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", pict: <PictTelegram size={28} />, title: "Open the bot", blurb: <>Tap <BotHandle />. No app to install, no signup. Telegram already knows who you are.</> },
    { n: "02", pict: <Pin size={22} />, title: "Tell it where", blurb: "Send a city, an address, or your location. Metrix shows what's open right now around you." },
    { n: "03", pict: <Clock size={22} />, title: "Pick a slot", blurb: "Tap an hour. Hold a room for 5 minutes while you check. Reschedule any time before check-in." },
    { n: "04", pict: <CheckDot size={24} color="var(--metrix-accent)" />, title: "Pay & walk in", blurb: "One-tap pay with Apple Pay, Google Pay or card on file. Door code lands in chat. That's it." },
  ];

  return (
    <section id="how" className="metrix-section metrix-how">
      <div className="metrix-wrap">
        <SectionHead eyebrow="How it works" title="Open the bot. Walk in. That's it." lead="Built for people who already live in their messenger. Everything happens inside the chat: discovery, payment, the door code, the receipt." />
        <div className="metrix-step-grid">
          {steps.map((step, index) => (
            <article key={step.n} className={index === 0 ? "is-accent" : ""} data-reveal data-delay={String(index * 100)}>
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
          ].map(([num, label], index) => (
            <div key={label} data-reveal data-delay={String(120 + index * 70)}><strong className="metrix-num">{num}</strong><span>{label}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingDemo() {
  const [city, setCity] = useState("Patriarchy");
  const [spaceId, setSpaceId] = useState<SpaceId>("desk");
  const [venueIdx, setVenueIdx] = useState(0);
  const [startIdx, setStartIdx] = useState(2);
  const [hours, setHours] = useState(3);
  const [people, setPeople] = useState(1);
  const [extras, setExtras] = useState({ coffee: false, parking: false, screen: true });
  const [confirmed, setConfirmed] = useState(false);

  const space = SPACE_OPTIONS.find((item) => item.id === spaceId) ?? SPACE_OPTIONS[0];
  const spaceVenues = BOOKING_VENUES[city]?.[spaceId] ?? BOOKING_VENUES.Patriarchy[spaceId];
  const venue = spaceVenues[Math.min(venueIdx, spaceVenues.length - 1)] ?? spaceVenues[0];
  const billableQuantity = venue.unit === "hour" ? hours : 1;
  const subtotal = venue.price * billableQuantity;
  const extrasCost = (extras.coffee ? 450 * hours : 0) + (extras.parking ? 800 : 0);
  const fee = Math.round((subtotal + extrasCost) * 0.06);
  const total = subtotal + extrasCost + fee;
  const quantityLabel = venue.unit === "hour" ? `${hours}h x ${formatRub(venue.price)}` : priceLabel(venue.price, venue.unit);
  const startHour = HOURS[startIdx];
  const endHour = HOURS[Math.min(startIdx + hours, HOURS.length - 1)] ?? "20:00";
  const receiptKey = `${city}-${spaceId}-${venueIdx}-${startIdx}-${hours}-${people}-${extras.coffee}-${extras.parking}-${extras.screen}`;

  useEffect(() => setVenueIdx(0), [city, spaceId]);
  useEffect(() => setConfirmed(false), [city, spaceId, venueIdx, startIdx, hours, people, extras]);

  return (
    <section id="demo" className="metrix-section metrix-demo">
      <div className="metrix-wrap">
        <SectionHead eyebrow="Live booking" title={<>Try real prices, <strong>right here.</strong></>} lead="Play with the booking surface using Moscow locations and RUB prices from the inventory. Every change updates the calculator and Telegram preview in real time." />
        <div className="metrix-demo-grid">
          <div className="metrix-card metrix-booking-surface" data-reveal="left">
            <Field label="01  Where">
              <div className="metrix-chip-row">{Object.keys(BOOKING_VENUES).map((item) => <Chip key={item} on={item === city} onClick={() => setCity(item)}><Pin size={12} /> {item}</Chip>)}</div>
            </Field>
            <Field label="02  What">
              <div className="metrix-space-options">
                {SPACE_OPTIONS.map((item) => (
                  <button key={item.id} className={item.id === spaceId ? "is-active" : ""} onClick={() => setSpaceId(item.id)}>
                    {item.pict(28)}<span>{item.name}</span><small>from {priceLabelShort(item.price, item.unit)}</small>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="03  Which" hint={`${spaceVenues.length} ${space.name.toLowerCase()}${spaceVenues.length === 1 ? "" : "s"} open in ${city}`}>
              <div className="metrix-venue-list">
                {spaceVenues.map((item, index) => (
                  <button key={item.name} className={index === venueIdx ? "is-active" : ""} onClick={() => setVenueIdx(index)}>
                    <i /><strong>{item.name}</strong><span>{item.area} · {priceLabel(item.price, item.unit)}</span>{index === 0 && <b>hot</b>}
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
                <Chip on={extras.coffee} onClick={() => setExtras((current) => ({ ...current, coffee: !current.coffee }))}>Coffee 450 RUB/hr</Chip>
                <Chip on={extras.parking} onClick={() => setExtras((current) => ({ ...current, parking: !current.parking }))}>Parking 800 RUB</Chip>
                {(spaceId === "meeting" || spaceId === "office") && <Chip on={extras.screen} onClick={() => setExtras((current) => ({ ...current, screen: !current.screen }))}>4K screen · free</Chip>}
              </div>
            </Field>
          </div>

          <aside className="metrix-receipt-stack" data-reveal="right" data-delay="120">
            <div key={receiptKey} className="metrix-card metrix-receipt">
              <header>
                <div><span className="metrix-eyebrow">Receipt</span><h3 className="metrix-display">{venue.name}</h3><p>{venue.area}, {city}</p></div>
                {space.pict(40)}
              </header>
              <ReceiptRow label={`${venue.name} · ${quantityLabel}`} value={formatRub(subtotal)} />
              {extras.coffee && <ReceiptRow label={`Coffee · ${hours}h x ${formatRub(450)}`} value={formatRub(450 * hours)} />}
              {extras.parking && <ReceiptRow label="Parking" value={formatRub(800)} />}
              <ReceiptRow label="Service fee" value={formatRub(fee)} muted />
              <hr />
              <div className="metrix-total">
                <span>Total · {venue.unit === "hour" ? `${hours}h` : venue.unit}</span>
                <strong key={total} className="metrix-num metrix-price-roll">{formatRub(total)}</strong>
              </div>
              {spaceId === "office" && <p className="metrix-total-context">/ month · fits teams of 8–12 · includes utilities</p>}
              <button onClick={() => setConfirmed(true)} className={`metrix-btn ${confirmed ? "is-confirmed" : ""}`}>
                {confirmed ? <><CheckDot color="var(--metrix-ink)" /> Booked!</> : <><PictTelegram size={16} /> Confirm via Telegram <Arrow /></>}
              </button>
              <small>Free cancellation up to 1 hour before · No card needed today</small>
            </div>
            <div className="metrix-card metrix-chat-snippet">
              <span className="metrix-eyebrow">What you'll see in chat</span>
              {confirmed ? (
                <p className="is-confirmed"><CheckDot color="var(--metrix-ink)" size={16} /> <strong>Booking confirmed</strong><br />{venue.name} · {startHour}-{endHour} · {formatRub(total)} paid<br />Door code <b>{1000 + (subtotal * 7) % 9000}</b></p>
              ) : (
                <p>Holding <strong>{venue.name}</strong> for you · {startHour} &gt; {endHour}<br /><span>Confirm within 5 minutes</span></p>
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
        <div className="metrix-b2b-panel" data-reveal>
          <div className="metrix-b2b-mark"><PictBuilding size={340} /></div>
          <div className="metrix-b2b-grid">
            <div data-reveal="left" data-delay="80">
              <div className="metrix-eyebrow metrix-tag-dot">For business</div>
              <h2 className="metrix-display">Turn Moscow into your <strong className="metrix-display-strong">office.</strong></h2>
              <p className="metrix-lead">One invoice. One dashboard. A monthly allowance per teammate, redeemable across 10 Metrix Moscow locations from Patriarchy to Sokol. Set up in 10 minutes.</p>
              <div className="metrix-b2b-actions"><a href="#demo" className="metrix-btn metrix-btn-primary">Book a demo <Arrow /></a><a href="#demo" className="metrix-btn metrix-btn-ghost">Pricing for teams</a></div>
            </div>
            <div className="metrix-b2b-features">
              {[
                ["01", "Monthly stipends", "Set a per-seat budget in RUB. Unused hours roll over. No haggling, no expense reports."],
                ["02", "SSO & SCIM", "Provision via Okta, Google, or Azure. Add a teammate and they're in the bot."],
                ["03", "Real-time receipts", "Every booking syncs to accounting as a CSV: itemized, VAT-split, audit-ready."],
              ].map(([num, title, text], index) => (
                <article key={num} className={index === 0 ? "is-dark" : ""} data-reveal="right" data-delay={String(120 + index * 90)}><h3><span className="metrix-num">{num}</span>{title}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </div>
        <div className="metrix-logo-strip" data-reveal data-delay="160">
          <p>Trusted by teams booking desks, rooms, and offices across <strong>10 Moscow locations</strong>.</p>
          {["ATLAS/CO", "Tundra", "Halcyon", "Northbound", "PARSE.fm", "Vellum&Co"].map((name) => <span key={name}>{name}</span>)}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  const faqs: Array<[string, React.ReactNode]> = [
    ["Do I need an account?", <>No. The Telegram bot is your account. Open <BotHandle />, send one message, and you're in. We use your Telegram identity for receipts and remember your card so you never re-enter it.</>],
    ["What if a space turns out to be busy or closed?", "Every booking is live-confirmed by the venue within 30 seconds. If we can't confirm, you're auto-refunded and offered the next-closest space at the same hour."],
    ["Can I cancel or move a booking?", "Yes. Free cancellation up to 60 minutes before check-in. Within the hour, you keep 50%. Move a booking to a different time, same venue, at any point."],
    ["How does pricing work?", "You pay the live venue rate in RUB plus a 6% Metrix fee. Desks start at 2 900 RUB / day, meeting rooms at 27 000 RUB / hour, private offices at 1 080 000 RUB / month, and team pods at 33 000 RUB / desk / month."],
    ["Which locations are live?", "Patriarchy, Belorusskaya, Paveletskaya, Moscow City, Kurskaya, Park Kultury, Tverskaya, Chistye Prudy, Taganskaya, and Sokol."],
    ["Is there a website to book from?", "Yes, this one. Use the live booking demo above to reserve right here. But once you've tried the Telegram flow, you probably won't come back."],
  ];

  return (
    <section id="faq" className="metrix-section metrix-faq">
      <div className="metrix-wrap">
        <SectionHead eyebrow="Questions" title={<>Common <strong>questions.</strong></>} lead="Answers for first bookings, cancellations, pricing, and which Moscow locations are already live." />
        <div className="metrix-faq-grid">
          <div className="metrix-faq-list" data-reveal>
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

          <aside className="metrix-card metrix-faq-help" data-reveal="right" data-delay="120">
            <h3 className="metrix-display">Still unsure?</h3>
            <strong>Send /help to the bot</strong>
            <p>A human responds within 90 seconds</p>
            <a href={TELEGRAM_BOT_URL} className="metrix-btn metrix-btn-accent" target="_blank" rel="noreferrer">
              Open @metritxsxbot <Arrow />
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <section className="metrix-footer-cta-section">
      <div className="metrix-wrap">
        <div className="metrix-footer-cta" data-reveal="scale">
          <div className="metrix-footer-texture" aria-hidden="true">8s</div>
          <span className="metrix-eyebrow metrix-tag-dot">Get started</span>
          <h2 className="metrix-display">Your next desk is<br /><span className="metrix-display-italic">one message away.</span></h2>
          <div className="metrix-hero-buttons"><a href={TELEGRAM_BOT_URL} className="metrix-btn metrix-btn-accent" target="_blank" rel="noreferrer"><PictTelegram size={16} /> Open @metritxsxbot <Arrow /></a><a href="#demo" className="metrix-btn metrix-btn-ghost">Get a Moscow demo</a></div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: React.ReactNode; lead: React.ReactNode }) {
  return (
    <div className="metrix-section-head" data-reveal>
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
  const palette: "bone" | "ink" = "bone";

  useEffect(() => {
    applyPalette(palette);
    document.body.classList.remove("no-italic-headlines");
  }, [palette]);

  return (
    <main className="metrix-site">
      <MetrixHeader />
      <Hero />
      <TrustStrip />
      <SpaceTabs />
      <HowItWorks />
      <BookingDemo />
      <B2B />
      <FAQ />
      <FooterCTA />
      <MetrixFooter />
    </main>
  );
}
