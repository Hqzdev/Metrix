"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Dollar01Icon,
  MinusSignIcon,
  PlusSignIcon,
  TrendingUp,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";

type Location = {
  id: string;
  name: string;
  city: string;
  address: string;
  occupancy: string;
  deskPrice: string;
  roomPrice: string;
  members: string;
  lat: number;
  lng: number;
  mapLeft: string;
  mapTop: string;
  towerHeight: number;
};

type Zone = {
  id: string;
  name: string;
  type: string;
  seats: string;
  occupancy: string;
  price: string;
  status: string;
  top: string;
  left: string;
  width: string;
  height: string;
};

type SharedBooking = {
  id: string;
  locationId: string;
  resourceId: string;
  resourceName: string;
  slotId: string;
  startsAt: string;
  startsAtIso: string;
  status: string;
};

type Viewport = {
  lat: number;
  lng: number;
  zoom: number;
};
const TILE_SIZE = 256;
const MIN_ZOOM = 10;
const MAX_ZOOM = 13;
const CITY_NAME = "Moscow";
const MAP_CENTER = { lat: 55.7558, lng: 37.6176 };
const TILE_GRID_SIZE = 5;

const zoneResourceIds: Record<string, Record<string, string>> = {
  patriarchy: {
    "design-team": "patriarchy-room-01",
    "private-office-a": "patriarchy-room-02",
    "client-suite": "patriarchy-room-03",
    "quiet-desks": "patriarchy-room-04",
    "ops-team": "patriarchy-room-05",
  },
  belorusskaya: {
    "product-bay": "belorusskaya-room-01",
    "founder-office": "belorusskaya-room-02",
    "townhall-room": "belorusskaya-room-03",
    "focus-lane": "belorusskaya-room-04",
    "sales-cluster": "belorusskaya-room-05",
  },
  paveletskaya: {
    "growth-pod": "paveletskaya-room-01",
    "private-office-b": "paveletskaya-room-02",
    "boardroom": "paveletskaya-room-03",
    "flex-desks": "paveletskaya-room-04",
    "engineering-room": "paveletskaya-room-05",
  },
  "city-north": {
    "skyline-pod": "city-north-room-01",
    "corner-office": "city-north-room-02",
    "summit-room": "city-north-room-03",
    "panorama-desks": "city-north-room-04",
    "finance-suite": "city-north-room-05",
  },
  kurskaya: {
    "switchyard-desks": "kurskaya-room-01",
    "brick-office": "kurskaya-room-02",
    "cargo-room": "kurskaya-room-03",
    "ring-desks": "kurskaya-room-04",
    "station-pod": "kurskaya-room-05",
  },
  "park-kultury": {
    "garden-desks": "park-kultury-room-01",
    "boulevard-office": "park-kultury-room-02",
    "atrium-room": "park-kultury-room-03",
    "river-lane": "park-kultury-room-04",
    "wellness-suite": "park-kultury-room-05",
  },
  tverskaya: {
    "avenue-desks": "tverskaya-room-01",
    "tverskaya-office": "tverskaya-room-02",
    "boulevard-room": "tverskaya-room-03",
    "rush-line": "tverskaya-room-04",
    "client-suite-t": "tverskaya-room-05",
  },
  "chistye-prudy": {
    "pond-desks": "chistye-prudy-room-01",
    "heritage-office": "chistye-prudy-room-02",
    "reading-room": "chistye-prudy-room-03",
    "tram-desks": "chistye-prudy-room-04",
    "prudy-pod": "chistye-prudy-room-05",
  },
  taganskaya: {
    "ring-hub": "taganskaya-room-01",
    "taganskaya-office": "taganskaya-room-02",
    "forum-room": "taganskaya-room-03",
    "east-desks": "taganskaya-room-04",
    "tagan-pod": "taganskaya-room-05",
  },
  sokol: {
    "airline-desks": "sokol-room-01",
    "runway-office": "sokol-room-02",
    "north-room": "sokol-room-03",
    "sokol-line": "sokol-room-04",
    "signal-room": "sokol-room-05",
  },
};

const locations: Location[] = [
  {
    id: "patriarchy",
    name: "Patriarchy Clubhouse",
    city: CITY_NAME,
    address: "18 Malaya Bronnaya Street",
    occupancy: "78% occupied",
    deskPrice: "$34/day",
    roomPrice: "$28/hour",
    members: "164 active members",
    lat: 55.7639,
    lng: 37.6016,
    mapLeft: "40%",
    mapTop: "31%",
    towerHeight: 124,
  },
  {
    id: "belorusskaya",
    name: "Belorusskaya Hub",
    city: CITY_NAME,
    address: "34 Lesnaya Street",
    occupancy: "66% occupied",
    deskPrice: "$29/day",
    roomPrice: "$24/hour",
    members: "119 active members",
    lat: 55.7772,
    lng: 37.5852,
    mapLeft: "28%",
    mapTop: "22%",
    towerHeight: 96,
  },
  {
    id: "paveletskaya",
    name: "Paveletskaya Loft",
    city: CITY_NAME,
    address: "5 Letnikovskaya Street",
    occupancy: "72% occupied",
    deskPrice: "$31/day",
    roomPrice: "$26/hour",
    members: "141 active members",
    lat: 55.7282,
    lng: 37.6444,
    mapLeft: "67%",
    mapTop: "63%",
    towerHeight: 110,
  },
  {
    id: "city-north",
    name: "Moscow City North Tower",
    city: CITY_NAME,
    address: "12 Presnenskaya Embankment",
    occupancy: "84% occupied",
    deskPrice: "$39/day",
    roomPrice: "$32/hour",
    members: "196 active members",
    lat: 55.7496,
    lng: 37.5374,
    mapLeft: "16%",
    mapTop: "48%",
    towerHeight: 156,
  },
  {
    id: "kurskaya",
    name: "Kurskaya Yard",
    city: CITY_NAME,
    address: "11 Zemlyanoy Val",
    occupancy: "69% occupied",
    deskPrice: "$30/day",
    roomPrice: "$25/hour",
    members: "132 active members",
    lat: 55.7573,
    lng: 37.6591,
    mapLeft: "58%",
    mapTop: "39%",
    towerHeight: 102,
  },
  {
    id: "park-kultury",
    name: "Park Kultury House",
    city: CITY_NAME,
    address: "21 Zubovsky Boulevard",
    occupancy: "63% occupied",
    deskPrice: "$28/day",
    roomPrice: "$23/hour",
    members: "108 active members",
    lat: 55.7352,
    lng: 37.5947,
    mapLeft: "35%",
    mapTop: "57%",
    towerHeight: 92,
  },
  {
    id: "tverskaya",
    name: "Tverskaya Rooms",
    city: CITY_NAME,
    address: "7 Tverskaya Street",
    occupancy: "76% occupied",
    deskPrice: "$33/day",
    roomPrice: "$27/hour",
    members: "155 active members",
    lat: 55.7581,
    lng: 37.6136,
    mapLeft: "45%",
    mapTop: "36%",
    towerHeight: 88,
  },
  {
    id: "chistye-prudy",
    name: "Chistye Prudy Corner",
    city: CITY_NAME,
    address: "19 Myasnitskaya Street",
    occupancy: "64% occupied",
    deskPrice: "$27/day",
    roomPrice: "$22/hour",
    members: "97 active members",
    lat: 55.7658,
    lng: 37.6381,
    mapLeft: "53%",
    mapTop: "32%",
    towerHeight: 82,
  },
  {
    id: "taganskaya",
    name: "Taganskaya Point",
    city: CITY_NAME,
    address: "3 Taganskaya Square",
    occupancy: "67% occupied",
    deskPrice: "$29/day",
    roomPrice: "$24/hour",
    members: "116 active members",
    lat: 55.7415,
    lng: 37.6537,
    mapLeft: "61%",
    mapTop: "49%",
    towerHeight: 86,
  },
  {
    id: "sokol",
    name: "Sokol Studio",
    city: CITY_NAME,
    address: "14 Leningradsky Avenue",
    occupancy: "58% occupied",
    deskPrice: "$26/day",
    roomPrice: "$21/hour",
    members: "89 active members",
    lat: 55.8041,
    lng: 37.5164,
    mapLeft: "18%",
    mapTop: "18%",
    towerHeight: 78,
  },
];

const zonesByLocation: Record<string, Zone[]> = {
  patriarchy: [
    { id: "design-team", name: "Library Desks", type: "Quiet shared zone", seats: "12 desks", occupancy: "10 of 12 occupied", price: "$390 / desk / month", status: "Only 2 desks left", top: "18%", left: "10%", width: "31%", height: "24%" },
    { id: "private-office-a", name: "Founder Office", type: "Private office", seats: "6 seats", occupancy: "4 of 6 occupied", price: "$1,460 / month", status: "Available now", top: "18%", left: "48%", width: "18%", height: "28%" },
    { id: "client-suite", name: "Garden Meeting Suite", type: "Meeting room", seats: "8 seats", occupancy: "Booked 58% this week", price: "$32 / hour", status: "Open after 2 PM", top: "20%", left: "71%", width: "19%", height: "22%" },
    { id: "quiet-desks", name: "Courtyard Bench", type: "Focused desk zone", seats: "14 desks", occupancy: "7 of 14 occupied", price: "$34 / day", status: "Best same-day option", top: "54%", left: "12%", width: "36%", height: "16%" },
    { id: "ops-team", name: "Editorial Studio", type: "Shared team area", seats: "10 desks", occupancy: "8 of 10 occupied", price: "$360 / desk / month", status: "High demand", top: "51%", left: "56%", width: "28%", height: "26%" },
  ],
  belorusskaya: [
    { id: "product-bay", name: "Launch Pad", type: "Shared team area", seats: "16 desks", occupancy: "9 of 16 occupied", price: "$330 / desk / month", status: "Available now", top: "16%", left: "8%", width: "34%", height: "26%" },
    { id: "founder-office", name: "Transit Office", type: "Private office", seats: "4 seats", occupancy: "2 of 4 occupied", price: "$1,080 / month", status: "Available tomorrow", top: "18%", left: "48%", width: "18%", height: "24%" },
    { id: "townhall-room", name: "Rail Meeting Room", type: "Meeting room", seats: "12 seats", occupancy: "Booked 49% this week", price: "$27 / hour", status: "Open after 5 PM", top: "18%", left: "71%", width: "20%", height: "24%" },
    { id: "focus-lane", name: "Hot Desk Boulevard", type: "Desk strip", seats: "18 desks", occupancy: "12 of 18 occupied", price: "$29 / day", status: "Steady traffic", top: "54%", left: "10%", width: "38%", height: "16%" },
    { id: "sales-cluster", name: "Client Sprint Pod", type: "Team pod", seats: "8 desks", occupancy: "6 of 8 occupied", price: "$345 / desk / month", status: "High demand", top: "50%", left: "56%", width: "26%", height: "28%" },
  ],
  paveletskaya: [
    { id: "growth-pod", name: "Riverside Pod", type: "Team pod", seats: "10 desks", occupancy: "8 of 10 occupied", price: "$365 / desk / month", status: "High demand", top: "16%", left: "11%", width: "29%", height: "24%" },
    { id: "private-office-b", name: "Bridge Office", type: "Private office", seats: "5 seats", occupancy: "4 of 5 occupied", price: "$1,390 / month", status: "One seat opens Friday", top: "18%", left: "47%", width: "19%", height: "25%" },
    { id: "boardroom", name: "Investor Room", type: "Meeting room", seats: "10 seats", occupancy: "Booked 63% this week", price: "$31 / hour", status: "Limited availability", top: "17%", left: "71%", width: "18%", height: "24%" },
    { id: "flex-desks", name: "Dockline Desks", type: "Desk zone", seats: "20 desks", occupancy: "9 of 20 occupied", price: "$31 / day", status: "Fastest check-in", top: "52%", left: "10%", width: "40%", height: "18%" },
    { id: "engineering-room", name: "Build Room", type: "Private team room", seats: "9 seats", occupancy: "7 of 9 occupied", price: "$1,980 / month", status: "Opens next week", top: "50%", left: "57%", width: "27%", height: "28%" },
  ],
  "city-north": [
    { id: "skyline-pod", name: "Skyline Pod", type: "Executive team zone", seats: "14 desks", occupancy: "12 of 14 occupied", price: "$430 / desk / month", status: "Premium demand", top: "16%", left: "9%", width: "32%", height: "24%" },
    { id: "corner-office", name: "Corner Office", type: "Private office", seats: "6 seats", occupancy: "5 of 6 occupied", price: "$1,720 / month", status: "Available next Monday", top: "17%", left: "49%", width: "18%", height: "25%" },
    { id: "summit-room", name: "Summit Room", type: "Boardroom", seats: "12 seats", occupancy: "Booked 71% this week", price: "$38 / hour", status: "Morning slots only", top: "18%", left: "71%", width: "19%", height: "23%" },
    { id: "panorama-desks", name: "Panorama Desks", type: "Flex desk zone", seats: "18 desks", occupancy: "11 of 18 occupied", price: "$39 / day", status: "Balanced occupancy", top: "53%", left: "11%", width: "38%", height: "17%" },
    { id: "finance-suite", name: "Finance Suite", type: "Private team room", seats: "10 seats", occupancy: "8 of 10 occupied", price: "$2,140 / month", status: "Tour required", top: "50%", left: "56%", width: "27%", height: "29%" },
  ],
  kurskaya: [
    { id: "switchyard-desks", name: "Switchyard Desks", type: "Shared work zone", seats: "15 desks", occupancy: "9 of 15 occupied", price: "$320 / desk / month", status: "Available now", top: "16%", left: "10%", width: "31%", height: "24%" },
    { id: "brick-office", name: "Brick Office", type: "Private office", seats: "5 seats", occupancy: "3 of 5 occupied", price: "$1,220 / month", status: "Ready this week", top: "18%", left: "48%", width: "18%", height: "25%" },
    { id: "cargo-room", name: "Cargo Room", type: "Meeting room", seats: "10 seats", occupancy: "Booked 46% this week", price: "$28 / hour", status: "Open after 1 PM", top: "18%", left: "71%", width: "19%", height: "23%" },
    { id: "ring-desks", name: "Ring Desks", type: "Desk zone", seats: "18 desks", occupancy: "10 of 18 occupied", price: "$30 / day", status: "Balanced demand", top: "53%", left: "11%", width: "38%", height: "17%" },
    { id: "station-pod", name: "Station Pod", type: "Team pod", seats: "8 desks", occupancy: "6 of 8 occupied", price: "$350 / desk / month", status: "High demand", top: "50%", left: "56%", width: "27%", height: "28%" },
  ],
  "park-kultury": [
    { id: "garden-desks", name: "Garden Desks", type: "Quiet work zone", seats: "14 desks", occupancy: "7 of 14 occupied", price: "$300 / desk / month", status: "Best availability", top: "16%", left: "10%", width: "31%", height: "24%" },
    { id: "boulevard-office", name: "Boulevard Office", type: "Private office", seats: "4 seats", occupancy: "2 of 4 occupied", price: "$1,090 / month", status: "Available tomorrow", top: "18%", left: "48%", width: "18%", height: "24%" },
    { id: "atrium-room", name: "Atrium Room", type: "Meeting room", seats: "8 seats", occupancy: "Booked 41% this week", price: "$24 / hour", status: "Open all afternoon", top: "18%", left: "71%", width: "19%", height: "22%" },
    { id: "river-lane", name: "River Lane", type: "Flex desk zone", seats: "16 desks", occupancy: "8 of 16 occupied", price: "$28 / day", status: "Low pressure", top: "54%", left: "11%", width: "37%", height: "16%" },
    { id: "wellness-suite", name: "Wellness Suite", type: "Private team room", seats: "7 seats", occupancy: "5 of 7 occupied", price: "$1,540 / month", status: "Tour available", top: "50%", left: "56%", width: "27%", height: "28%" },
  ],
  tverskaya: [
    { id: "avenue-desks", name: "Avenue Desks", type: "Shared desk zone", seats: "14 desks", occupancy: "11 of 14 occupied", price: "$360 / desk / month", status: "High demand", top: "16%", left: "10%", width: "31%", height: "24%" },
    { id: "tverskaya-office", name: "Central Office", type: "Private office", seats: "5 seats", occupancy: "3 of 5 occupied", price: "$1,340 / month", status: "Available now", top: "18%", left: "48%", width: "18%", height: "25%" },
    { id: "boulevard-room", name: "Boulevard Room", type: "Meeting room", seats: "10 seats", occupancy: "Booked 54% this week", price: "$29 / hour", status: "Open after 4 PM", top: "18%", left: "71%", width: "19%", height: "23%" },
    { id: "rush-line", name: "Rush Line", type: "Desk zone", seats: "18 desks", occupancy: "12 of 18 occupied", price: "$33 / day", status: "Peak demand", top: "53%", left: "11%", width: "38%", height: "17%" },
    { id: "client-suite-t", name: "Client Suite", type: "Team room", seats: "8 seats", occupancy: "6 of 8 occupied", price: "$1,620 / month", status: "Tour required", top: "50%", left: "56%", width: "27%", height: "28%" },
  ],
  "chistye-prudy": [
    { id: "pond-desks", name: "Pond Desks", type: "Quiet work zone", seats: "13 desks", occupancy: "7 of 13 occupied", price: "$285 / desk / month", status: "Good availability", top: "16%", left: "10%", width: "31%", height: "24%" },
    { id: "heritage-office", name: "Heritage Office", type: "Private office", seats: "4 seats", occupancy: "2 of 4 occupied", price: "$1,040 / month", status: "Available now", top: "18%", left: "48%", width: "18%", height: "24%" },
    { id: "reading-room", name: "Reading Room", type: "Meeting room", seats: "8 seats", occupancy: "Booked 39% this week", price: "$22 / hour", status: "Open all day", top: "18%", left: "71%", width: "19%", height: "22%" },
    { id: "tram-desks", name: "Tram Desks", type: "Desk strip", seats: "16 desks", occupancy: "9 of 16 occupied", price: "$27 / day", status: "Steady demand", top: "54%", left: "11%", width: "37%", height: "16%" },
    { id: "prudy-pod", name: "Prudy Pod", type: "Team pod", seats: "7 desks", occupancy: "4 of 7 occupied", price: "$298 / desk / month", status: "Flexible access", top: "50%", left: "56%", width: "27%", height: "28%" },
  ],
  taganskaya: [
    { id: "ring-hub", name: "Ring Hub", type: "Shared team area", seats: "15 desks", occupancy: "10 of 15 occupied", price: "$312 / desk / month", status: "Available now", top: "16%", left: "10%", width: "31%", height: "24%" },
    { id: "taganskaya-office", name: "Square Office", type: "Private office", seats: "5 seats", occupancy: "4 of 5 occupied", price: "$1,180 / month", status: "One seat free", top: "18%", left: "48%", width: "18%", height: "25%" },
    { id: "forum-room", name: "Forum Room", type: "Meeting room", seats: "9 seats", occupancy: "Booked 52% this week", price: "$25 / hour", status: "Open after 6 PM", top: "18%", left: "71%", width: "19%", height: "23%" },
    { id: "east-desks", name: "East Desks", type: "Desk zone", seats: "17 desks", occupancy: "11 of 17 occupied", price: "$29 / day", status: "Balanced demand", top: "53%", left: "11%", width: "38%", height: "17%" },
    { id: "tagan-pod", name: "Tagan Pod", type: "Private team room", seats: "8 seats", occupancy: "6 of 8 occupied", price: "$1,470 / month", status: "Opens Friday", top: "50%", left: "56%", width: "27%", height: "28%" },
  ],
  sokol: [
    { id: "airline-desks", name: "Airline Desks", type: "Shared desk zone", seats: "12 desks", occupancy: "6 of 12 occupied", price: "$270 / desk / month", status: "Low pressure", top: "16%", left: "10%", width: "31%", height: "24%" },
    { id: "runway-office", name: "Runway Office", type: "Private office", seats: "4 seats", occupancy: "2 of 4 occupied", price: "$990 / month", status: "Available now", top: "18%", left: "48%", width: "18%", height: "24%" },
    { id: "north-room", name: "North Room", type: "Meeting room", seats: "7 seats", occupancy: "Booked 35% this week", price: "$21 / hour", status: "Open all afternoon", top: "18%", left: "71%", width: "19%", height: "22%" },
    { id: "sokol-line", name: "Sokol Line", type: "Flex desk zone", seats: "14 desks", occupancy: "6 of 14 occupied", price: "$26 / day", status: "Best value", top: "54%", left: "11%", width: "37%", height: "16%" },
    { id: "crew-suite", name: "Crew Suite", type: "Team room", seats: "6 seats", occupancy: "3 of 6 occupied", price: "$1,260 / month", status: "Tour available", top: "50%", left: "56%", width: "27%", height: "28%" },
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lngToX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToY(lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    TILE_SIZE *
    2 ** zoom
  );
}

function getTileUrl(x: number, y: number, z: number) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function getDistrictLabel(locationId: string) {
  switch (locationId) {
    case "patriarchy": return "Patriarshiye Ponds";
    case "belorusskaya": return "Belorusskaya";
    case "paveletskaya": return "Paveletskaya";
    case "city-north": return "Moscow City";
    case "kurskaya": return "Kurskaya";
    case "park-kultury": return "Park Kultury";
    case "tverskaya": return "Tverskaya";
    case "chistye-prudy": return "Chistye Prudy";
    case "taganskaya": return "Taganskaya";
    case "sokol": return "Sokol";
    default: return CITY_NAME;
  }
}

const MapPoint = memo(function MapPoint({
  id,
  name,
  district,
  left,
  top,
  active,
  onHover,
  onSelect,
}: {
  id: string;
  name: string;
  district: string;
  left: string;
  top: string;
  active: boolean;
  onHover: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={() => onHover(id)}
      onFocus={() => onHover(id)}
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      className="absolute -translate-x-1/2 -translate-y-1/2 text-left focus:outline-none"
      style={{ left, top }}
    >
      <div className="relative">
        <div
          className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-all duration-150 ${
            active ? "bg-indigo-500/40 scale-[2.8]" : "bg-indigo-400/20 scale-150"
          }`}
        />
        <div className="relative flex items-center justify-center">
          <div
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              active
                ? "border-indigo-600 bg-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]"
                : "border-white bg-indigo-400"
            }`}
          />
        </div>
        <div
          className={`pointer-events-none absolute left-1/2 top-full mt-3 min-w-36 -translate-x-1/2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur-md transition-all duration-150 ${
            active
              ? "border-indigo-600 bg-indigo-600 text-white opacity-100"
              : "border-white/80 bg-white/95 text-zinc-800 opacity-0 dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:text-zinc-100"
          }`}
        >
          <p className="text-xs font-semibold tracking-tight">{name}</p>
          <p className={`mt-0.5 text-[10px] uppercase tracking-widest ${active ? "text-indigo-200" : "text-zinc-500 dark:text-zinc-400"}`}>
            {district}
          </p>
        </div>
      </div>
    </button>
  );
});

const MapCanvas = memo(function MapCanvas({
  viewport,
  setViewport,
  hoveredLocationId,
  setHoveredLocationId,
  onSelectLocation,
}: {
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  hoveredLocationId: string;
  setHoveredLocationId: (id: string) => void;
  onSelectLocation: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingDeltaRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const mapData = useMemo(() => {
    const tileZoom = Math.floor(viewport.zoom);
    const zoomScale = 2 ** (viewport.zoom - tileZoom);
    const centerWorldX = lngToX(viewport.lng, tileZoom);
    const centerWorldY = latToY(viewport.lat, tileZoom);
    const centerTileX = Math.floor(centerWorldX / TILE_SIZE);
    const centerTileY = Math.floor(centerWorldY / TILE_SIZE);
    const half = Math.floor(TILE_GRID_SIZE / 2);
    const minTileX = centerTileX - half;
    const minTileY = centerTileY - half;
    const viewSize = TILE_GRID_SIZE * TILE_SIZE;
    const scaledViewSize = viewSize / zoomScale;
    const minWorldX = centerWorldX - scaledViewSize / 2;
    const minWorldY = centerWorldY - scaledViewSize / 2;

    const tiles = Array.from({ length: TILE_GRID_SIZE * TILE_GRID_SIZE }, (_, index) => {
      const col = index % TILE_GRID_SIZE;
      const row = Math.floor(index / TILE_GRID_SIZE);
      const x = minTileX + col;
      const y = minTileY + row;
      return {
        key: `${tileZoom}-${x}-${y}`,
        src: getTileUrl(x, y, tileZoom),
        left: `${(col / TILE_GRID_SIZE) * 100}%`,
        top: `${(row / TILE_GRID_SIZE) * 100}%`,
        size: `${100 / TILE_GRID_SIZE}%`,
      };
    });

    const points = locations.map((loc) => {
      const worldX = lngToX(loc.lng, tileZoom);
      const worldY = latToY(loc.lat, tileZoom);
      return {
        id: loc.id,
        name: loc.name,
        district: getDistrictLabel(loc.id),
        left: `${((worldX - minWorldX) / scaledViewSize) * 100}%`,
        top: `${((worldY - minWorldY) / scaledViewSize) * 100}%`,
      };
    });

    return { tiles, points, zoomScale };
  }, [viewport.lat, viewport.lng, viewport.zoom]);

  const zoomBy = useCallback((delta: number) => {
    setViewport((cur) => ({
      ...cur,
      zoom: clamp(Number((cur.zoom + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
    }));
  }, [setViewport]);

  const handleHover = useCallback((id: string) => setHoveredLocationId(id), [setHoveredLocationId]);
  const handleSelect = useCallback((id: string) => onSelectLocation(id), [onSelectLocation]);

  // Native passive:false wheel listener with RAF batching — prevents page scroll
  // and limits React state updates to one per animation frame (~60fps max).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pendingDeltaRef.current += e.deltaY < 0 ? 0.18 : -0.18;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const delta = pendingDeltaRef.current;
        pendingDeltaRef.current = 0;
        setViewport((cur) => ({
          ...cur,
          zoom: clamp(Number((cur.zoom + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
        }));
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative min-h-[680px] touch-none overflow-hidden rounded-2xl border border-zinc-200 bg-indigo-50/40 shadow-[0_20px_60px_rgba(99,102,241,0.08)] dark:border-zinc-700/50 dark:bg-zinc-900"
      >
        <div className="absolute inset-[2%] overflow-hidden rounded-[1.4rem] border border-white/70 bg-[#F8F8FF] shadow-inner dark:border-zinc-700/60 dark:bg-zinc-950">
          {/* No CSS transition — direct scale via RAF update for smooth zoom */}
          <div
            className="absolute inset-0 origin-center"
            style={{ transform: `scale(${mapData.zoomScale})`, willChange: "transform" }}
          >
            {mapData.tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.src}
                alt=""
                draggable={false}
                decoding="async"
                className="pointer-events-none absolute select-none object-cover"
                style={{ left: tile.left, top: tile.top, width: tile.size, height: tile.size }}
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-indigo-600/[0.03]" />
            {mapData.points.map((p) => (
              <MapPoint
                key={p.id}
                id={p.id}
                name={p.name}
                district={p.district}
                left={p.left}
                top={p.top}
                active={p.id === hoveredLocationId}
                onHover={handleHover}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>

        {/* Bottom-left attribution */}
        <div className="pointer-events-none absolute bottom-8 left-8 rounded-xl border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-md backdrop-blur-md dark:border-zinc-700/70 dark:bg-zinc-900/90">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">OpenStreetMap Moscow</p>
          <p className="mt-1.5 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            {locations.length} locations across Moscow
          </p>
        </div>

        {/* Top-left hint */}
        <div className="absolute left-6 top-6 max-w-[18rem] rounded-xl border border-zinc-200/80 bg-white/90 px-4 py-3.5 shadow-md backdrop-blur-md dark:border-zinc-700/70 dark:bg-zinc-900/90">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">{CITY_NAME} booking map</p>
          <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
            Hover or click a marker to preview the location, then open the floor plan.
          </p>
          <p className="mt-2 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            Zoom {viewport.zoom.toFixed(1)}x
          </p>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-6 right-6 flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => zoomBy(0.25)}
            className="flex h-12 w-12 items-center justify-center border-b border-zinc-100 text-zinc-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"
            aria-label="Zoom in"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-0.25)}
            className="flex h-12 w-12 items-center justify-center text-zinc-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-zinc-300 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300"
            aria-label="Zoom out"
          >
            <HugeiconsIcon icon={MinusSignIcon} size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
});

export function BookingMapExplorer() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string>(locations[0].id);
  const [sharedBookings, setSharedBookings] = useState<SharedBooking[]>([]);
  const [viewport, setViewport] = useState<Viewport>({
    lat: MAP_CENTER.lat,
    lng: MAP_CENTER.lng,
    zoom: 11,
  });

  const activeLocation = useMemo(() => {
    return locations.find((location) => location.id === (selectedLocationId ?? hoveredLocationId)) ?? locations[0];
  }, [hoveredLocationId, selectedLocationId]);

  const zones = zonesByLocation[activeLocation.id];
  const [hoveredZoneId, setHoveredZoneId] = useState<string>(zones[0].id);

  const hoveredZone = zones.find((zone) => zone.id === hoveredZoneId) ?? zones[0];
  const activeBookingsByResource = useMemo(() => {
    return sharedBookings.reduce<Record<string, SharedBooking[]>>((acc, booking) => {
      acc[booking.resourceId] ??= [];
      acc[booking.resourceId].push(booking);
      return acc;
    }, {});
  }, [sharedBookings]);
  const activeBookingsByLocation = useMemo(() => {
    return sharedBookings.reduce<Record<string, SharedBooking[]>>((acc, booking) => {
      acc[booking.locationId] ??= [];
      acc[booking.locationId].push(booking);
      return acc;
    }, {});
  }, [sharedBookings]);
  const activeLocationBookingCount = activeBookingsByLocation[activeLocation.id]?.length ?? 0;
  const activeLocationOccupancy = `${Math.min(activeLocationBookingCount, 10)}/10 booked`;
  const activeLocationActivity = `${activeLocationBookingCount} active Telegram booking${activeLocationBookingCount === 1 ? "" : "s"}`;
  const hoveredZoneResourceId = zoneResourceIds[activeLocation.id]?.[hoveredZone.id];
  const hoveredZoneBookings = hoveredZoneResourceId ? (activeBookingsByResource[hoveredZoneResourceId] ?? []) : [];
  const hoveredZoneStatus = hoveredZoneBookings.length > 0 ? "Booked via Telegram" : "Available";
  const hoveredZoneOccupancy =
    hoveredZoneBookings.length > 0
      ? `${hoveredZoneBookings.length} active Telegram booking${hoveredZoneBookings.length === 1 ? "" : "s"}`
      : "0 bookings";

  useEffect(() => {
    let isMounted = true;
    async function loadSharedBookings() {
      try {
        const response = await fetch("/api/shared-bookings", { cache: "no-store" });
        if (!response.ok) { if (isMounted) setSharedBookings([]); return; }
        const data = (await response.json()) as { bookings?: SharedBooking[] };
        if (isMounted) setSharedBookings(data.bookings ?? []);
      } catch {
        if (isMounted) setSharedBookings([]);
      }
    }
    void loadSharedBookings();
    const intervalId = window.setInterval(loadSharedBookings, 15000);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, []);

  const openLocation = (locationId: string) => {
    const location = locations.find((item) => item.id === locationId);
    if (!location) return;
    setHoveredLocationId(locationId);
    setSelectedLocationId(locationId);
    setHoveredZoneId(zonesByLocation[locationId][0].id);
    const nextViewportByLocation: Record<string, Viewport> = {
      patriarchy: { lat: 55.7639, lng: 37.6016, zoom: 12.2 },
      belorusskaya: { lat: 55.7772, lng: 37.5852, zoom: 12.1 },
      paveletskaya: { lat: 55.7282, lng: 37.6444, zoom: 12.1 },
      "city-north": { lat: 55.7496, lng: 37.5374, zoom: 12.35 },
      kurskaya: { lat: 55.7573, lng: 37.6591, zoom: 12.05 },
      "park-kultury": { lat: 55.7352, lng: 37.5947, zoom: 11.8 },
      tverskaya: { lat: 55.7581, lng: 37.6136, zoom: 12.25 },
      "chistye-prudy": { lat: 55.7658, lng: 37.6381, zoom: 12.15 },
      taganskaya: { lat: 55.7415, lng: 37.6537, zoom: 12.0 },
      sokol: { lat: 55.8041, lng: 37.5164, zoom: 11.6 },
    };
    setViewport(nextViewportByLocation[locationId] ?? { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng, zoom: 11 });
  };

  /* ── Step 2: Floor plan ──────────────────────────────── */
  if (selectedLocationId) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.9fr]">
        {/* Floor plan panel */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Step 2</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {activeLocation.name} floor map
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLocationId(null)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
              Back to map
            </button>
          </div>

          <div className="p-6">
            <div className="grid gap-5">
              {/* Floor plan visual */}
              <div className="relative min-h-[560px] overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40 shadow-sm dark:border-zinc-700/50 dark:from-indigo-950/35 dark:via-zinc-950 dark:to-violet-950/25">
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="absolute left-[5%] top-[8%] h-[84%] w-[90%] rounded-2xl border border-dashed border-indigo-300/50" />
                  <div className="absolute left-[43.5%] top-[8%] h-[84%] w-px bg-indigo-200/40" />
                  <div className="absolute left-[5%] top-[46%] h-px w-[90%] bg-indigo-200/40" />
                </div>
                <div className="pointer-events-none absolute left-[43%] top-[7%] h-[86%] w-[14%] rounded-full bg-gradient-to-b from-indigo-200/60 to-violet-200/40 opacity-70" />
                <div className="pointer-events-none absolute left-[6%] top-[44%] h-[12%] w-[88%] rounded-full bg-gradient-to-r from-indigo-100/50 to-violet-100/40 opacity-60" />

                {zones.map((zone) => {
                  const isActive = hoveredZone.id === zone.id;
                  const resourceId = zoneResourceIds[activeLocation.id]?.[zone.id];
                  const bookingCount = resourceId ? (activeBookingsByResource[resourceId]?.length ?? 0) : 0;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onMouseEnter={() => setHoveredZoneId(zone.id)}
                      onFocus={() => setHoveredZoneId(zone.id)}
                      className={`absolute overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_20px_40px_rgba(99,102,241,0.25)]"
                          : "border-indigo-100 bg-white/85 text-zinc-900 hover:border-indigo-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:border-indigo-500 dark:hover:bg-zinc-800"
                      }`}
                      style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height }}
                    >
                      <div className="flex h-full flex-col justify-between p-2.5">
                        <div className="min-w-0">
                          <p className={`truncate text-[8px] font-semibold uppercase leading-none tracking-wide ${isActive ? "text-indigo-200" : "text-zinc-400 dark:text-zinc-500"}`}>
                            {zone.type}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-tight tracking-tight">
                            {zone.name}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-[9px] ${isActive ? "text-indigo-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                            {zone.seats}
                          </p>
                          <span
                            className={`mt-1 inline-block max-w-full truncate rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-none ${
                              bookingCount > 0
                                ? isActive ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
                                : isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                            }`}
                          >
                            {bookingCount > 0 ? "Booked" : zone.price}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Hover insight sidebar */}
        <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Hover insight</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{hoveredZone.name}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Live availability preview for desks, offices, and team zones inside {activeLocation.name}.
            </p>
          </div>
          <div className="grid gap-3 p-6">
            {[
              { label: "Occupancy", value: hoveredZoneOccupancy, sub: null },
              { label: "Price", value: hoveredZone.price, sub: null },
              { label: "Status", value: hoveredZoneStatus, sub: hoveredZoneBookings[0] ? `Nearest: ${hoveredZoneBookings[0].startsAt}` : null },
              { label: "District", value: getDistrictLabel(activeLocation.id), sub: activeLocation.address },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{item.label}</p>
                <p className="mt-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-white">{item.value}</p>
                {item.sub && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.sub}</p>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  /* ── Step 1: City map ──────────────────────────────────── */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_0.9fr]">
      {/* Map panel */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-7 py-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Step 1</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Explore Moscow and choose the right workspace
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Compare districts, hover each office for demand signals, and open the location that fits your team or meeting best.
          </p>
        </div>
        <div className="p-7">
          <MapCanvas
            viewport={viewport}
            setViewport={setViewport}
            hoveredLocationId={hoveredLocationId}
            setHoveredLocationId={setHoveredLocationId}
            onSelectLocation={openLocation}
          />
        </div>
      </div>

      {/* Location preview sidebar */}
      <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-6 py-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Location preview</p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{activeLocation.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Hover a point on the map to preview occupancy, pricing, and activity before opening the floor plan.
          </p>
        </div>

        <div className="grid gap-3 p-6">
          {/* District — indigo hero card */}
          <div className="rounded-xl bg-indigo-600 p-5 shadow-lg shadow-indigo-200 dark:shadow-indigo-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200">District</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-white">{getDistrictLabel(activeLocation.id)}</p>
            <p className="mt-1 text-sm text-indigo-200">{activeLocation.address}</p>
          </div>

          {/* Occupancy */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
              <HugeiconsIcon icon={TrendingUp} size={16} strokeWidth={1.75} />
              <p className="text-[10px] font-semibold uppercase tracking-widest">Occupancy</p>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{activeLocationOccupancy}</p>
          </div>

          {/* Desk price */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
              <HugeiconsIcon icon={Dollar01Icon} size={16} strokeWidth={1.75} />
              <p className="text-[10px] font-semibold uppercase tracking-widest">Desk price</p>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{activeLocation.deskPrice}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Meeting rooms from {activeLocation.roomPrice}</p>
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
              <HugeiconsIcon icon={UserMultipleIcon} size={16} strokeWidth={1.75} />
              <p className="text-[10px] font-semibold uppercase tracking-widest">Activity</p>
            </div>
            <p className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{activeLocationActivity}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Inside {CITY_NAME}, ready for same-city booking.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
