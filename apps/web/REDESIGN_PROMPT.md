# Metrix Web — SaaS Redesign Prompt

## Context

The current site (`apps/web/`) is a luxury editorial landing page: monochromatic black/white palette, serif display font (PP Editorial New), full-bleed photography, almost no UI chrome. It reads like a premium coworking brand brochure.

The goal is to completely reposition it as a **consumer SaaS product** — bright, energetic, opinionated — the kind of site Linear, Loom, Notion, or Raycast would ship. Think: product-first, feature-driven, slightly playful, technically confident.

---

## 1. Design System — `globals.css`

Replace the current neutral monochrome tokens with a vibrant SaaS palette.

**New color scheme (light mode default, no dark mode needed for now):**

```css
:root {
  /* Brand */
  --brand: #6366F1;          /* indigo — primary action color */
  --brand-light: #EEF2FF;    /* indigo tint for backgrounds */
  --brand-dark: #4338CA;     /* indigo hover state */

  /* Semantic */
  --background: #FAFAFA;
  --foreground: #0F0F10;
  --surface: #FFFFFF;        /* card/panel surface */
  --surface-raised: #F4F4F5; /* slightly elevated surface */

  --primary: #6366F1;
  --primary-foreground: #FFFFFF;
  --secondary: #F4F4F5;
  --secondary-foreground: #0F0F10;
  --muted: #F4F4F5;
  --muted-foreground: #71717A;
  --accent: #F0FDF4;         /* green tint for "live" / availability states */
  --accent-foreground: #15803D;

  --destructive: #EF4444;
  --border: #E4E4E7;
  --ring: #6366F1;

  /* Radius — rounded, not square */
  --radius: 0.75rem;
}
```

**Typography:**
- Remove PP Editorial New (serif display font) — replace with **Inter** everywhere, weight 400/500/600/700
- Display headings: Inter, `font-weight: 700`, `letter-spacing: -0.03em`
- No more `font-display` serif class in the theme

**Add these utility classes to globals.css:**

```css
/* Gradient text — for hero headlines */
.gradient-text {
  background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glowing card border */
.glow-border {
  border: 1px solid rgba(99, 102, 241, 0.3);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.1), 0 4px 24px rgba(99, 102, 241, 0.08);
}

/* Soft gradient background for sections */
.gradient-bg {
  background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
}

/* Product UI mockup shadow */
.mockup-shadow {
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08);
}
```

---

## 2. Header — `components/header.tsx`

Current: floating pill, minimal logo, small nav links, "Book a tour" CTA.

**New header:**
- Keep the floating pill shape and backdrop blur — it works
- Replace logo text "Metrix" with a small colored icon mark + wordmark in Inter bold
- Nav links: `Product`, `Pricing`, `Changelog`, `Docs` — all `text-sm font-medium text-zinc-500 hover:text-zinc-900`
- Add a **status badge** next to the logo: a tiny green dot + "99.9% uptime" or "Live availability" — this signals SaaS confidence
- CTA button: replace "Book a tour" with **"Start for free"** — `bg-[#6366F1] text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-[#4338CA] transition-colors`
- Secondary CTA: plain text link "Sign in" before the main button

---

## 3. Hero Section — `components/landing/sections/hero-section.tsx`

Current: full-screen scroll animation where "METRIX" text animates then a bento of coworking photos expands. Heavy on photography, almost no product copy.

**Completely replace the hero.** Remove the scroll-hijacked photo animation entirely. Replace with:

**Layout:** Two-column on desktop, stacked on mobile.

**Left column (copy):**
```
[Badge pill] "Now in public beta →"

[H1, 56px, font-weight 700, letter-spacing -0.03em]
"Book a desk.
Show up.
Get to work."

[Subhead, 20px, text-zinc-500, max-w-md]
"Metrix is the fastest way to book coworking space — 
hot desks, private offices, and meeting rooms, 
available on your schedule via Telegram."

[CTA row]
[Primary button] "Get started free"  →  bg-indigo-500, white, rounded-full, px-6 py-3, text-base font-semibold
[Secondary button] "See how it works"  →  text-zinc-600, flex items-center gap-1.5, with a play icon

[Social proof line, text-sm text-zinc-400]
"Trusted by 500+ freelancers and teams"  +  3-4 small avatar images stacked
```

**Right column (product visual):**
- Show a **UI mockup** — not a photo. Render a fake phone/Telegram chat interface in JSX showing the booking flow:
  - Bot message: "📍 Choose your location:"
  - 3 inline keyboard buttons: "Arbat", "Patriki", "Novy Arbat"
  - Bot message: "✅ Desk booked for 10:00–18:00. See you tomorrow!"
- Style this as a rounded phone frame (`rounded-[2.5rem] border-8 border-zinc-900 bg-white mockup-shadow`)
- Add a floating badge above the phone: "⚡ Books in under 30 seconds"
- Add soft indigo radial glow behind the phone (`gradient-bg`)

**Background:** `bg-[#FAFAFA]` with a very subtle indigo radial gradient at the top center.

---

## 4. Philosophy Section → "How It Works" — `components/landing/sections/philosophy-section.tsx`

Current: scroll-animated 3D title rotation ("Work Near What Matters." etc.) + blurry word reveal paragraph.

**Replace with a classic SaaS "How it works" section — 3 steps:**

```
Section heading (center):  "Three taps to a booked desk"
Subhead: "No accounts, no credit cards, no friction. Just Telegram."

[3-column grid on desktop, stacked on mobile]

Step 1:
  Icon: 📍 in a soft indigo rounded square (48×48, bg-indigo-100)
  Title: "Pick your spot"
  Body: "Browse live desk and room availability across all Metrix locations. See what's open right now."

Step 2:
  Icon: 🗓️
  Title: "Choose your time"
  Body: "Hourly or full-day. Lock in a desk for a focused session or an office for the whole week."

Step 3:
  Icon: ✅
  Title: "Pay and show up"
  Body: "Pay instantly via Telegram Payments. Get a confirmation and walk in. No check-in desk needed."

[Between steps: small connecting arrow or numbered badges 01 / 02 / 03]
```

Style: `bg-white` section, `glow-border` cards, soft drop shadow, rounded-xl corners.

---

## 5. Featured Products Section → "What you can book" — `components/landing/sections/featured-products-section.tsx`

Current: photo bento grid of coworking spaces.

**Replace with a feature/product card grid** — remove the photo bento. Show 4 workspace type cards:

```
[2×2 grid on desktop, 1-col stacked on mobile]

Card 1: Hot Desk
  Background: soft indigo gradient (bg-gradient-to-br from-indigo-50 to-violet-50)
  Icon: 💻
  Title: "Hot Desk"
  Tags: ["From ₽800/day", "Book by the hour"]
  Body: "Drop-in desks in the open floor. Fast wifi, monitors available."
  CTA link: "Book now →"

Card 2: Private Office
  Background: soft green gradient (from-emerald-50 to-teal-50)
  Icon: 🚪
  Title: "Private Office"
  Tags: ["From ₽3,500/day", "1–6 people"]
  Body: "Lockable rooms for focused work or confidential calls."

Card 3: Meeting Room
  Background: soft orange gradient (from-amber-50 to-orange-50)
  Icon: 🎙️
  Title: "Meeting Room"
  Tags: ["From ₽1,200/hour", "TV + whiteboard"]
  Body: "Impress clients or run standups. Book for exactly the time you need."

Card 4: Dedicated Desk
  Background: soft pink gradient (from-rose-50 to-pink-50)
  Icon: 📌
  Title: "Dedicated Desk"
  Tags: ["Monthly plans", "Your stuff, always there"]
  Body: "Reserve the same desk every day. Build routine, store gear."
```

Cards: `rounded-2xl border border-zinc-100 p-8 hover:shadow-lg transition-shadow`

---

## 6. Technology Section → "Live Availability" Feature Highlight — `components/landing/sections/technology-section.tsx`

Current: full-screen black section with scroll-driven image transitions and blur word reveals. Very cinematic, very editorial.

**Replace with a two-column feature highlight section:**

Left: copy
```
[Eyebrow, indigo, text-sm font-semibold uppercase tracking-wide]
"Real-time booking"

[H2, 40px]
"Always know what's open
before you leave home."

[Body]
"Metrix syncs desk and room availability in real time. 
No stale calendars, no double-bookings. 
What you see in the bot is what's actually free."

[Feature checklist — 4 items with green checkmarks]
✓ Live availability updated every 60 seconds
✓ Instant payment confirmation via Telegram Payments  
✓ Automatic reminders 15 min before your booking
✓ Works on any device — no app install required
```

Right: a **dashboard-style UI mockup** in JSX:
- Render a simplified calendar/availability grid
- Show time slots (9:00–10:00, 10:00–11:00, etc.) in a mini weekly view
- Green = available, gray = booked, indigo = your booking
- Add a pulsing green dot somewhere labeled "Live"
- Use `mockup-shadow`, `rounded-2xl`, `border border-zinc-100`

Section background: `bg-[#FAFAFA]` with a very subtle radial gradient.

---

## 7. Gallery Section → Pricing — `components/landing/sections/gallery-section.tsx`

Current: photo gallery (masonry or grid of coworking interior photos).

**Replace with a pricing section:**

```
[Section heading, center]
"Simple, transparent pricing"
[Subhead] "No hidden fees. Cancel any time."

[3-column pricing cards on desktop]

Card 1 — Drop-In
  Price: "₽800" / day
  Subtext: "billed per visit"
  Features: Hot desk access, Wifi, Coffee, Locker
  CTA: "Start booking"
  Style: white card, border

Card 2 — Pro  [POPULAR badge in indigo]
  Price: "₽12,000" / month  
  Subtext: "~₽545/day"
  Features: Everything in Drop-In + Dedicated desk, Priority room booking, 10h meeting room credits, Guest passes (2/month)
  CTA: "Get Pro"
  Style: indigo background, white text, slightly larger, slight scale/elevation

Card 3 — Team
  Price: "From ₽40,000" / month
  Subtext: "for up to 5 members"
  Features: Everything in Pro + Private office, Unlimited meeting rooms, Admin dashboard, Custom invoicing
  CTA: "Contact us"
  Style: white card, border
```

---

## 8. Collection Section → Testimonials/Social Proof — `components/landing/sections/collection-section.tsx`

Current: editorial collection/product showcase.

**Replace with a testimonials / social proof strip:**

- 3 testimonial quote cards in a horizontal row (scroll on mobile)
- Each card: avatar initials in colored circle, name, role, company, quote text
- Make up 3 realistic quotes about the booking experience
- Style: `bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm`
- Above the cards: a row of company logos (simple text logos in `text-zinc-400 font-semibold text-sm`) — "Used by teams at:" + 5-6 fictional startup names

---

## 9. Editorial Section — `components/landing/sections/editorial-section.tsx`

Current: editorial/brand storytelling section.

**Replace with a "Telegram-native" feature callout:**

Full-width section with `bg-indigo-600` background, white text:
```
[Center aligned]

[Icon: Telegram logo SVG, 48px, white]

[H2, white, 40px]
"Lives where your team already is."

[Body, indigo-200]
"No new app to download. No new account to create.
Metrix is a Telegram bot — your team uses Telegram,
so booking a desk is as easy as sending a message."

[CTA button] "Open in Telegram →"  →  white bg, indigo text, rounded-full
```

---

## 10. Testimonials Section → Stats/Social Proof Strip — `components/landing/sections/testimonials-section.tsx`

Current: single large full-bleed photo with white quote text overlay.

**Replace with a stats strip** (4 numbers in a horizontal row):

```
bg-zinc-900 section, white text

[4-column grid]
"500+"       "12"          "30 sec"        "99.9%"
Bookings     Locations     Avg book time   Uptime
per month    in Moscow
```

Each stat: number in bold 48px, label in `text-zinc-400 text-sm` below.

---

## 11. Footer — `components/layout/footer-section.tsx`

Current: look at the existing file.

**Update the footer:**
- Keep the structure but update colors to match the new design system
- Replace any serif font usage with Inter
- Ensure the CTA in the footer says "Start for free" not "Book a tour"
- Add a row with: `Product` `Pricing` `Changelog` `Privacy` `Terms` `Status`
- Bottom bar: "© 2026 Metrix. Made for freelancers and teams." + Telegram icon link

---

## 12. Page Layout — `app/page.tsx`

Update the page to use the new section order:
```tsx
<Header />
<HeroSection />
<HowItWorksSection />        // renamed from PhilosophySection
<WorkspaceTypesSection />    // renamed from FeaturedProductsSection
<LiveAvailabilitySection />  // renamed from TechnologySection
<PricingSection />           // renamed from GallerySection
<SocialProofSection />       // renamed from CollectionSection
<TelegramCalloutSection />   // renamed from EditorialSection
<StatsSection />             // renamed from TestimonialsSection
<FooterSection />
```

---

## Implementation Notes

- **No more scroll-hijacking animations** — replace all `sticky + height:350vh` scroll-driven sections with standard scroll-into-view reveals using Intersection Observer. Keep animations lightweight: `opacity 0→1 + translateY 20px→0` on entry, 0.5s ease-out.
- **Remove PP Editorial New** font imports — it's a paid font anyway, Inter handles everything.
- **Keep existing component file names** where possible — just overwrite content. This avoids import chain updates.
- **Image assets**: all the `/images/*.png` references in the old sections are being removed. No new image assets are required — all visuals should be JSX/CSS UI mockups.
- **Tailwind**: the project uses Tailwind v4 (`@import 'tailwindcss'`). Use utility classes for everything. For custom colors not in the design token system, use arbitrary values like `bg-[#6366F1]`.
- **Do not touch**: `apps/bot/`, `packages/`, anything outside `apps/web/`. This is a frontend-only change.
