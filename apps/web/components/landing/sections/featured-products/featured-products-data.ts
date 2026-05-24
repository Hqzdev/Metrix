import {
  DeskIcon,
  DoorOpenIcon,
  LaptopIcon,
  MeetingRoomIcon,
} from "@hugeicons/core-free-icons";

export const workspaces = [
  {
    icon: LaptopIcon,
    color: "#6366F1",
    iconBgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    labelClass:
      "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:ring-indigo-900/50",
    ctaClass: "text-indigo-600 hover:text-indigo-800",
    tickColor: "#6366F1",
    label: "Drop-in",
    title: "Hot Desk",
    price: "₽800",
    period: "/day",
    description:
      "Drop into any open-floor desk across our network. Pay only for the days you actually show up.",
    features: [
      "High-speed wifi + monitor on request",
      "Book by the hour or full day",
      "Access to 12 Moscow locations",
    ],
    cta: "Book a desk",
    href: "/booking",
  },
  {
    icon: DoorOpenIcon,
    color: "#10B981",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    labelClass:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900/50",
    ctaClass: "text-emerald-600 hover:text-emerald-800",
    tickColor: "#10B981",
    label: "1–6 people",
    title: "Private Office",
    price: "₽3,500",
    period: "/day",
    description:
      "A lockable room that's entirely yours. Perfect for sensitive calls, deep work, or small-team sprints.",
    features: [
      "Lockable door — your space, your rules",
      "Dedicated high-speed connection",
      "Reception & client-ready entrance",
    ],
    cta: "Book an office",
    href: "/booking",
  },
  {
    icon: MeetingRoomIcon,
    color: "#F59E0B",
    iconBgClass: "bg-amber-50 dark:bg-amber-950/40",
    labelClass:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:ring-amber-900/50",
    ctaClass: "text-amber-600 hover:text-amber-800",
    tickColor: "#F59E0B",
    label: "TV + whiteboard",
    title: "Meeting Room",
    price: "₽1,200",
    period: "/hour",
    description:
      "Book exactly the time you need — not the full day. Works for client presentations, standups, and sprints.",
    features: [
      "4K TV + magnetic whiteboard",
      "Up to 12 people per room",
      "Instant booking via Telegram",
    ],
    cta: "Reserve a room",
    href: "/booking",
  },
  {
    icon: DeskIcon,
    color: "#8B5CF6",
    iconBgClass: "bg-violet-50 dark:bg-violet-950/40",
    labelClass:
      "bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:ring-violet-900/50",
    ctaClass: "text-violet-600 hover:text-violet-800",
    tickColor: "#8B5CF6",
    label: "Monthly plan",
    title: "Dedicated Desk",
    price: "₽12,000",
    period: "/month",
    description:
      "The same desk, every day. Leave your monitor, your keyboard — come back tomorrow and it's still yours.",
    features: [
      "Reserved spot — your gear stays safe",
      "Cross-location access included",
      "Saves 32% vs daily drop-in",
    ],
    cta: "See memberships",
    href: "/memberships",
  },
] as const;

export type WorkspaceProduct = (typeof workspaces)[number];
