/* Metrix — custom geometric pictograms.
   All drawn from simple shapes (circles, rects, lines). No clip-paths.
   Stroke uses currentColor so they inherit text color. */

const Pict = ({ children, size = 56, label }) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    style={{ display: "inline-flex", width: size, height: size }}
  >
    <svg viewBox="0 0 56 56" width={size} height={size} fill="none">
      {children}
    </svg>
  </span>
);

// 1. Hot desk — a desk with a monitor and a coffee dot
const PictDesk = ({ size }) => (
  <Pict size={size} label="Hot desk">
    <rect x="6" y="38" width="44" height="3" rx="1.5" fill="currentColor" />
    <rect x="9" y="41" width="3" height="9" rx="1" fill="currentColor" />
    <rect x="44" y="41" width="3" height="9" rx="1" fill="currentColor" />
    <rect x="14" y="16" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2.4" />
    <rect x="22" y="32" width="6" height="6" fill="currentColor" />
    <circle cx="44" cy="22" r="5" fill="var(--accent)" stroke="currentColor" strokeWidth="2.4" />
    <rect x="42" y="14" width="4" height="4" rx="1" fill="currentColor" />
  </Pict>
);

// 2. Meeting room — table + chairs
const PictMeeting = ({ size }) => (
  <Pict size={size} label="Meeting room">
    <rect x="14" y="22" width="28" height="12" rx="3" stroke="currentColor" strokeWidth="2.4" />
    <circle cx="9" cy="18" r="4" fill="currentColor" />
    <circle cx="47" cy="18" r="4" fill="currentColor" />
    <circle cx="9" cy="38" r="4" fill="currentColor" />
    <circle cx="47" cy="38" r="4" fill="currentColor" />
    <circle cx="28" cy="28" r="3" fill="var(--accent)" />
  </Pict>
);

// 3. Private office — door with key dot
const PictOffice = ({ size }) => (
  <Pict size={size} label="Private office">
    <rect x="10" y="8" width="36" height="40" rx="2" stroke="currentColor" strokeWidth="2.4" />
    <rect x="18" y="16" width="20" height="28" rx="1.5" fill="currentColor" />
    <circle cx="33" cy="32" r="2.5" fill="var(--accent)" />
    <rect x="6" y="46" width="44" height="3" rx="1.5" fill="currentColor" />
  </Pict>
);

// 4. Event space — three stacked rectangles
const PictEvent = ({ size }) => (
  <Pict size={size} label="Event space">
    <rect x="6" y="42" width="44" height="6" rx="1.5" fill="currentColor" />
    <rect x="12" y="28" width="32" height="14" rx="1.5" stroke="currentColor" strokeWidth="2.4" />
    <circle cx="20" cy="35" r="2" fill="currentColor" />
    <circle cx="28" cy="35" r="2" fill="currentColor" />
    <circle cx="36" cy="35" r="2" fill="currentColor" />
    <path d="M16 28 L28 12 L40 28" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="28" cy="20" r="3" fill="var(--accent)" />
  </Pict>
);

// 5. Telegram paper-plane (custom rendition)
const PictTelegram = ({ size = 18 }) => (
  <span style={{ display: "inline-flex", width: size, height: size }}>
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path
        d="M3 11.2L21 4l-3.2 16-5.8-5.4-3.4 3.2 0-4.6L19 6.6 8 12 3 11.2z"
        fill="currentColor"
      />
    </svg>
  </span>
);

// 6. Arrow
const Arrow = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className="arrow">
    <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 7. Checkmark dot
const CheckDot = ({ size = 18, color = "var(--ok)" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 8. Plus
const Plus = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 9. Pin
const Pin = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="9" r="2.4" fill="currentColor" />
  </svg>
);

// 10. Clock
const Clock = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 11. Building / pictogram for B2B
const PictBuilding = ({ size = 56 }) => (
  <Pict size={size} label="Building">
    <rect x="10" y="10" width="36" height="40" rx="2" stroke="currentColor" strokeWidth="2.4" />
    <rect x="16" y="16" width="6" height="6" fill="currentColor" />
    <rect x="25" y="16" width="6" height="6" fill="currentColor" />
    <rect x="34" y="16" width="6" height="6" fill="var(--accent)" />
    <rect x="16" y="25" width="6" height="6" fill="currentColor" />
    <rect x="25" y="25" width="6" height="6" fill="var(--accent)" />
    <rect x="34" y="25" width="6" height="6" fill="currentColor" />
    <rect x="16" y="34" width="6" height="6" fill="var(--accent)" />
    <rect x="25" y="34" width="6" height="6" fill="currentColor" />
    <rect x="34" y="34" width="6" height="6" fill="currentColor" />
    <rect x="24" y="43" width="8" height="7" fill="currentColor" />
  </Pict>
);

// 12. Lightning (for "fast")
const PictBolt = ({ size = 56 }) => (
  <Pict size={size} label="Fast">
    <path d="M30 6 L14 32 L26 32 L22 50 L42 22 L30 22 L34 6 Z" fill="var(--accent)" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
  </Pict>
);

// 13. Cards / stack
const PictStack = ({ size = 56 }) => (
  <Pict size={size}>
    <rect x="10" y="18" width="30" height="22" rx="3" fill="currentColor" />
    <rect x="16" y="12" width="30" height="22" rx="3" fill="var(--accent)" stroke="currentColor" strokeWidth="2.4" />
  </Pict>
);

// 14. Calendar
const PictCal = ({ size = 56 }) => (
  <Pict size={size}>
    <rect x="8" y="12" width="40" height="36" rx="3" stroke="currentColor" strokeWidth="2.4" />
    <path d="M8 22h40" stroke="currentColor" strokeWidth="2.4" />
    <rect x="16" y="6" width="3" height="10" rx="1" fill="currentColor" />
    <rect x="37" y="6" width="3" height="10" rx="1" fill="currentColor" />
    <rect x="14" y="28" width="6" height="5" rx="1" fill="currentColor" />
    <rect x="25" y="28" width="6" height="5" rx="1" fill="var(--accent)" />
    <rect x="36" y="28" width="6" height="5" rx="1" fill="currentColor" />
    <rect x="14" y="37" width="6" height="5" rx="1" fill="currentColor" />
    <rect x="25" y="37" width="6" height="5" rx="1" fill="currentColor" />
  </Pict>
);

Object.assign(window, {
  PictDesk, PictMeeting, PictOffice, PictEvent,
  PictTelegram, Arrow, CheckDot, Plus, Pin, Clock,
  PictBuilding, PictBolt, PictStack, PictCal,
});
