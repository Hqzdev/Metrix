"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, DollarSign, MapPin, Minus, Plus, TrendingUp, Users } from "lucide-react";

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
    {
      id: "design-team",
      name: "Library Desks",
      type: "Quiet shared zone",
      seats: "12 desks",
      occupancy: "10 of 12 occupied",
      price: "$390 / desk / month",
      status: "Only 2 desks left",
      top: "18%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "private-office-a",
      name: "Founder Office",
      type: "Private office",
      seats: "6 seats",
      occupancy: "4 of 6 occupied",
      price: "$1,460 / month",
      status: "Available now",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "28%",
    },
    {
      id: "client-suite",
      name: "Garden Meeting Suite",
      type: "Meeting room",
      seats: "8 seats",
      occupancy: "Booked 58% this week",
      price: "$32 / hour",
      status: "Open after 2 PM",
      top: "20%",
      left: "71%",
      width: "19%",
      height: "22%",
    },
    {
      id: "quiet-desks",
      name: "Courtyard Bench",
      type: "Focused desk zone",
      seats: "14 desks",
      occupancy: "7 of 14 occupied",
      price: "$34 / day",
      status: "Best same-day option",
      top: "54%",
      left: "12%",
      width: "36%",
      height: "16%",
    },
    {
      id: "ops-team",
      name: "Editorial Studio",
      type: "Shared team area",
      seats: "10 desks",
      occupancy: "8 of 10 occupied",
      price: "$360 / desk / month",
      status: "High demand",
      top: "51%",
      left: "56%",
      width: "28%",
      height: "26%",
    },
  ],
  belorusskaya: [
    {
      id: "product-bay",
      name: "Launch Pad",
      type: "Shared team area",
      seats: "16 desks",
      occupancy: "9 of 16 occupied",
      price: "$330 / desk / month",
      status: "Available now",
      top: "16%",
      left: "8%",
      width: "34%",
      height: "26%",
    },
    {
      id: "founder-office",
      name: "Transit Office",
      type: "Private office",
      seats: "4 seats",
      occupancy: "2 of 4 occupied",
      price: "$1,080 / month",
      status: "Available tomorrow",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "24%",
    },
    {
      id: "townhall-room",
      name: "Rail Meeting Room",
      type: "Meeting room",
      seats: "12 seats",
      occupancy: "Booked 49% this week",
      price: "$27 / hour",
      status: "Open after 5 PM",
      top: "18%",
      left: "71%",
      width: "20%",
      height: "24%",
    },
    {
      id: "focus-lane",
      name: "Hot Desk Boulevard",
      type: "Desk strip",
      seats: "18 desks",
      occupancy: "12 of 18 occupied",
      price: "$29 / day",
      status: "Steady traffic",
      top: "54%",
      left: "10%",
      width: "38%",
      height: "16%",
    },
    {
      id: "sales-cluster",
      name: "Client Sprint Pod",
      type: "Team pod",
      seats: "8 desks",
      occupancy: "6 of 8 occupied",
      price: "$345 / desk / month",
      status: "High demand",
      top: "50%",
      left: "56%",
      width: "26%",
      height: "28%",
    },
  ],
  paveletskaya: [
    {
      id: "growth-pod",
      name: "Riverside Pod",
      type: "Team pod",
      seats: "10 desks",
      occupancy: "8 of 10 occupied",
      price: "$365 / desk / month",
      status: "High demand",
      top: "16%",
      left: "11%",
      width: "29%",
      height: "24%",
    },
    {
      id: "private-office-b",
      name: "Bridge Office",
      type: "Private office",
      seats: "5 seats",
      occupancy: "4 of 5 occupied",
      price: "$1,390 / month",
      status: "One seat opens Friday",
      top: "18%",
      left: "47%",
      width: "19%",
      height: "25%",
    },
    {
      id: "boardroom",
      name: "Investor Room",
      type: "Meeting room",
      seats: "10 seats",
      occupancy: "Booked 63% this week",
      price: "$31 / hour",
      status: "Limited availability",
      top: "17%",
      left: "71%",
      width: "18%",
      height: "24%",
    },
    {
      id: "flex-desks",
      name: "Dockline Desks",
      type: "Desk zone",
      seats: "20 desks",
      occupancy: "9 of 20 occupied",
      price: "$31 / day",
      status: "Fastest check-in",
      top: "52%",
      left: "10%",
      width: "40%",
      height: "18%",
    },
    {
      id: "engineering-room",
      name: "Build Room",
      type: "Private team room",
      seats: "9 seats",
      occupancy: "7 of 9 occupied",
      price: "$1,980 / month",
      status: "Opens next week",
      top: "50%",
      left: "57%",
      width: "27%",
      height: "28%",
    },
  ],
  "city-north": [
    {
      id: "skyline-pod",
      name: "Skyline Pod",
      type: "Executive team zone",
      seats: "14 desks",
      occupancy: "12 of 14 occupied",
      price: "$430 / desk / month",
      status: "Premium demand",
      top: "16%",
      left: "9%",
      width: "32%",
      height: "24%",
    },
    {
      id: "corner-office",
      name: "Corner Office",
      type: "Private office",
      seats: "6 seats",
      occupancy: "5 of 6 occupied",
      price: "$1,720 / month",
      status: "Available next Monday",
      top: "17%",
      left: "49%",
      width: "18%",
      height: "25%",
    },
    {
      id: "summit-room",
      name: "Summit Room",
      type: "Boardroom",
      seats: "12 seats",
      occupancy: "Booked 71% this week",
      price: "$38 / hour",
      status: "Morning slots only",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "23%",
    },
    {
      id: "panorama-desks",
      name: "Panorama Desks",
      type: "Flex desk zone",
      seats: "18 desks",
      occupancy: "11 of 18 occupied",
      price: "$39 / day",
      status: "Balanced occupancy",
      top: "53%",
      left: "11%",
      width: "38%",
      height: "17%",
    },
    {
      id: "finance-suite",
      name: "Finance Suite",
      type: "Private team room",
      seats: "10 seats",
      occupancy: "8 of 10 occupied",
      price: "$2,140 / month",
      status: "Tour required",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "29%",
    },
  ],
  kurskaya: [
    {
      id: "switchyard-desks",
      name: "Switchyard Desks",
      type: "Shared work zone",
      seats: "15 desks",
      occupancy: "9 of 15 occupied",
      price: "$320 / desk / month",
      status: "Available now",
      top: "16%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "brick-office",
      name: "Brick Office",
      type: "Private office",
      seats: "5 seats",
      occupancy: "3 of 5 occupied",
      price: "$1,220 / month",
      status: "Ready this week",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "25%",
    },
    {
      id: "cargo-room",
      name: "Cargo Room",
      type: "Meeting room",
      seats: "10 seats",
      occupancy: "Booked 46% this week",
      price: "$28 / hour",
      status: "Open after 1 PM",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "23%",
    },
    {
      id: "ring-desks",
      name: "Ring Desks",
      type: "Desk zone",
      seats: "18 desks",
      occupancy: "10 of 18 occupied",
      price: "$30 / day",
      status: "Balanced demand",
      top: "53%",
      left: "11%",
      width: "38%",
      height: "17%",
    },
    {
      id: "station-pod",
      name: "Station Pod",
      type: "Team pod",
      seats: "8 desks",
      occupancy: "6 of 8 occupied",
      price: "$350 / desk / month",
      status: "High demand",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "28%",
    },
  ],
  "park-kultury": [
    {
      id: "garden-desks",
      name: "Garden Desks",
      type: "Quiet work zone",
      seats: "14 desks",
      occupancy: "7 of 14 occupied",
      price: "$300 / desk / month",
      status: "Best availability",
      top: "16%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "boulevard-office",
      name: "Boulevard Office",
      type: "Private office",
      seats: "4 seats",
      occupancy: "2 of 4 occupied",
      price: "$1,090 / month",
      status: "Available tomorrow",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "24%",
    },
    {
      id: "atrium-room",
      name: "Atrium Room",
      type: "Meeting room",
      seats: "8 seats",
      occupancy: "Booked 41% this week",
      price: "$24 / hour",
      status: "Open all afternoon",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "22%",
    },
    {
      id: "river-lane",
      name: "River Lane",
      type: "Flex desk zone",
      seats: "16 desks",
      occupancy: "8 of 16 occupied",
      price: "$28 / day",
      status: "Low pressure",
      top: "54%",
      left: "11%",
      width: "37%",
      height: "16%",
    },
    {
      id: "wellness-suite",
      name: "Wellness Suite",
      type: "Private team room",
      seats: "7 seats",
      occupancy: "5 of 7 occupied",
      price: "$1,540 / month",
      status: "Tour available",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "28%",
    },
  ],
  tverskaya: [
    {
      id: "avenue-desks",
      name: "Avenue Desks",
      type: "Shared desk zone",
      seats: "14 desks",
      occupancy: "11 of 14 occupied",
      price: "$360 / desk / month",
      status: "High demand",
      top: "16%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "tverskaya-office",
      name: "Central Office",
      type: "Private office",
      seats: "5 seats",
      occupancy: "3 of 5 occupied",
      price: "$1,340 / month",
      status: "Available now",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "25%",
    },
    {
      id: "boulevard-room",
      name: "Boulevard Room",
      type: "Meeting room",
      seats: "10 seats",
      occupancy: "Booked 54% this week",
      price: "$29 / hour",
      status: "Open after 4 PM",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "23%",
    },
    {
      id: "rush-line",
      name: "Rush Line",
      type: "Desk zone",
      seats: "18 desks",
      occupancy: "12 of 18 occupied",
      price: "$33 / day",
      status: "Peak demand",
      top: "53%",
      left: "11%",
      width: "38%",
      height: "17%",
    },
    {
      id: "client-suite-t",
      name: "Client Suite",
      type: "Team room",
      seats: "8 seats",
      occupancy: "6 of 8 occupied",
      price: "$1,620 / month",
      status: "Tour required",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "28%",
    },
  ],
  "chistye-prudy": [
    {
      id: "pond-desks",
      name: "Pond Desks",
      type: "Quiet work zone",
      seats: "13 desks",
      occupancy: "7 of 13 occupied",
      price: "$285 / desk / month",
      status: "Good availability",
      top: "16%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "heritage-office",
      name: "Heritage Office",
      type: "Private office",
      seats: "4 seats",
      occupancy: "2 of 4 occupied",
      price: "$1,040 / month",
      status: "Available now",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "24%",
    },
    {
      id: "reading-room",
      name: "Reading Room",
      type: "Meeting room",
      seats: "8 seats",
      occupancy: "Booked 39% this week",
      price: "$22 / hour",
      status: "Open all day",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "22%",
    },
    {
      id: "tram-desks",
      name: "Tram Desks",
      type: "Desk strip",
      seats: "16 desks",
      occupancy: "9 of 16 occupied",
      price: "$27 / day",
      status: "Steady demand",
      top: "54%",
      left: "11%",
      width: "37%",
      height: "16%",
    },
    {
      id: "prudy-pod",
      name: "Prudy Pod",
      type: "Team pod",
      seats: "7 desks",
      occupancy: "4 of 7 occupied",
      price: "$298 / desk / month",
      status: "Flexible access",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "28%",
    },
  ],
  taganskaya: [
    {
      id: "ring-hub",
      name: "Ring Hub",
      type: "Shared team area",
      seats: "15 desks",
      occupancy: "10 of 15 occupied",
      price: "$312 / desk / month",
      status: "Available now",
      top: "16%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "taganskaya-office",
      name: "Square Office",
      type: "Private office",
      seats: "5 seats",
      occupancy: "4 of 5 occupied",
      price: "$1,180 / month",
      status: "One seat free",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "25%",
    },
    {
      id: "forum-room",
      name: "Forum Room",
      type: "Meeting room",
      seats: "9 seats",
      occupancy: "Booked 52% this week",
      price: "$25 / hour",
      status: "Open after 6 PM",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "23%",
    },
    {
      id: "east-desks",
      name: "East Desks",
      type: "Desk zone",
      seats: "17 desks",
      occupancy: "11 of 17 occupied",
      price: "$29 / day",
      status: "Balanced demand",
      top: "53%",
      left: "11%",
      width: "38%",
      height: "17%",
    },
    {
      id: "tagan-pod",
      name: "Tagan Pod",
      type: "Private team room",
      seats: "8 seats",
      occupancy: "6 of 8 occupied",
      price: "$1,470 / month",
      status: "Opens Friday",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "28%",
    },
  ],
  sokol: [
    {
      id: "airline-desks",
      name: "Airline Desks",
      type: "Shared desk zone",
      seats: "12 desks",
      occupancy: "6 of 12 occupied",
      price: "$270 / desk / month",
      status: "Low pressure",
      top: "16%",
      left: "10%",
      width: "31%",
      height: "24%",
    },
    {
      id: "runway-office",
      name: "Runway Office",
      type: "Private office",
      seats: "4 seats",
      occupancy: "2 of 4 occupied",
      price: "$990 / month",
      status: "Available now",
      top: "18%",
      left: "48%",
      width: "18%",
      height: "24%",
    },
    {
      id: "north-room",
      name: "North Room",
      type: "Meeting room",
      seats: "7 seats",
      occupancy: "Booked 35% this week",
      price: "$21 / hour",
      status: "Open all afternoon",
      top: "18%",
      left: "71%",
      width: "19%",
      height: "22%",
    },
    {
      id: "sokol-line",
      name: "Sokol Line",
      type: "Flex desk zone",
      seats: "14 desks",
      occupancy: "6 of 14 occupied",
      price: "$26 / day",
      status: "Best value",
      top: "54%",
      left: "11%",
      width: "37%",
      height: "16%",
    },
    {
      id: "crew-suite",
      name: "Crew Suite",
      type: "Team room",
      seats: "6 seats",
      occupancy: "3 of 6 occupied",
      price: "$1,260 / month",
      status: "Tour available",
      top: "50%",
      left: "56%",
      width: "27%",
      height: "28%",
    },
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
    case "patriarchy":
      return "Patriarshiye Ponds";
    case "belorusskaya":
      return "Belorusskaya";
    case "paveletskaya":
      return "Paveletskaya";
    case "city-north":
      return "Moscow City";
    case "kurskaya":
      return "Kurskaya";
    case "park-kultury":
      return "Park Kultury";
    case "tverskaya":
      return "Tverskaya";
    case "chistye-prudy":
      return "Chistye Prudy";
    case "taganskaya":
      return "Taganskaya";
    case "sokol":
      return "Sokol";
    default:
      return CITY_NAME;
  }
}

function MapPoint({
  location,
  active,
  onHover,
  onSelect,
}: {
  location: Location;
  active: boolean;
  onHover: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseEnter={() => onHover(location.id)}
      onFocus={() => onHover(location.id)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(location.id);
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 text-left focus:outline-none"
      style={{ left: location.mapLeft, top: location.mapTop }}
    >
      <div className="relative">
        <div
          className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-all duration-200 ${
            active ? "bg-[#2c2418]/25 scale-[2.4]" : "bg-[#2c2418]/10 scale-150"
          }`}
        />
        <div className="relative flex items-center justify-center">
          <div
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-200 ${
              active
                ? "border-[#2c2418] bg-[#2c2418] shadow-[0_0_0_4px_rgba(44,36,24,0.14)]"
                : "border-[#fcfaf5] bg-[#8a7348]"
            }`}
          />
        </div>
        <div
          className={`pointer-events-none absolute left-1/2 top-full mt-3 min-w-36 -translate-x-1/2 rounded-xl border px-3 py-2 shadow-[0_18px_40px_rgba(35,26,14,0.12)] backdrop-blur-md transition-all duration-200 ${
            active
              ? "border-[#2c2418] bg-[#2c2418] text-[#f7f1e6] opacity-100"
              : "border-white/80 bg-[#fcfaf5]/92 text-[#2c2418] opacity-0"
          }`}
        >
          <p className="text-xs font-medium tracking-tight">{location.name}</p>
          <p className={`mt-1 text-[11px] uppercase tracking-[0.22em] ${active ? "text-[#cdbd9d]" : "text-[#6e5d46]"}`}>
            {getDistrictLabel(location.id)}
          </p>
        </div>
      </div>
    </button>
  );
}

function MapCanvas({
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

    const points = locations.map((location) => {
      const worldX = lngToX(location.lng, tileZoom);
      const worldY = latToY(location.lat, tileZoom);

      return {
        ...location,
        mapLeft: `${((worldX - minWorldX) / scaledViewSize) * 100}%`,
        mapTop: `${((worldY - minWorldY) / scaledViewSize) * 100}%`,
      };
    });

    return { tiles, points, zoomScale };
  }, [viewport.lat, viewport.lng, viewport.zoom]);

  const zoomBy = (delta: number) => {
    setViewport((current) => ({
      ...current,
      zoom: clamp(Number((current.zoom + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM),
    }));
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.18 : -0.18);
  };

  const activeLocation = useMemo(
    () => locations.find((location) => location.id === hoveredLocationId) ?? locations[0],
    [hoveredLocationId],
  );

  return (
    <div className="relative">
      <div
        className="relative min-h-[680px] overflow-hidden border border-[#d8d0c2] bg-[#e8e1d2] touch-none shadow-[0_32px_90px_rgba(30,24,15,0.12)]"
        onWheel={handleWheel}
      >
        <div className="absolute inset-[2%] overflow-hidden rounded-[1.8rem] border border-white/70 bg-[#efe8dc] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]">
          <div
            className="absolute inset-0 origin-center transition-transform duration-200 ease-out"
            style={{ transform: `scale(${mapData.zoomScale})` }}
          >
            {mapData.tiles.map((tile) => (
              <img
                key={tile.key}
                src={tile.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute select-none object-cover"
                style={{
                  left: tile.left,
                  top: tile.top,
                  width: tile.size,
                  height: tile.size,
                }}
              />
            ))}

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,240,0.05),rgba(27,20,13,0.06))]" />

            {mapData.points.map((location) => (
              <MapPoint
                key={location.id}
                location={location}
                active={location.id === hoveredLocationId}
                onHover={setHoveredLocationId}
                onSelect={onSelectLocation}
              />
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-8 left-8 rounded-[1.2rem] border border-white/70 bg-[#fcfaf5]/90 px-5 py-4 shadow-[0_18px_34px_rgba(31,24,16,0.1)] backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#7b6a4e]">OpenStreetMap Moscow</p>
          <p className="mt-2 text-sm leading-6 text-[#433826]">
            {locations.length} locations across Moscow on a standard city map with small markers.
          </p>
        </div>

        <div className="absolute left-6 top-6 max-w-[20rem] rounded-[1.6rem] border border-white/75 bg-[#fcfaf5]/92 px-5 py-4 shadow-[0_22px_50px_rgba(31,24,16,0.12)] backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7b6a4e]">{CITY_NAME} booking map</p>
          <p className="mt-3 text-sm leading-6 text-[#433826]">
            Hover or click a marker to preview the location, then open the floor plan.
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#8c7a5f]">
            Zoom {viewport.zoom.toFixed(1)}x
          </p>
        </div>

        <div className="absolute bottom-6 right-6 flex flex-col overflow-hidden rounded-[1.4rem] border border-white/75 bg-[#fcfaf5]/94 shadow-[0_22px_50px_rgba(31,24,16,0.12)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => zoomBy(0.25)}
            className="flex h-14 w-14 items-center justify-center border-b border-[#e4dccd] text-[#2c2418] transition-colors hover:bg-[#f1eadf]"
            aria-label="Zoom in"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-0.25)}
            className="flex h-14 w-14 items-center justify-center text-[#2c2418] transition-colors hover:bg-[#f1eadf]"
            aria-label="Zoom out"
          >
            <Minus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function BookingMapExplorer() {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string>(locations[0].id);
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

  if (selectedLocationId) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.55fr_0.9fr]">
        <div className="border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Step 2</p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-foreground">
                {activeLocation.name} floor map
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedLocationId(null)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Moscow map
            </button>
          </div>

          <div className="p-6">
            <div className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {zones.map((zone) => {
                  const isActive = hoveredZone.id === zone.id;

                  return (
                    <button
                      key={`card-${zone.id}`}
                      type="button"
                      onMouseEnter={() => setHoveredZoneId(zone.id)}
                      onFocus={() => setHoveredZoneId(zone.id)}
                      className={`rounded-[1.6rem] border px-4 py-4 text-left transition-all ${
                        isActive
                          ? "border-[#2c2418] bg-[#2c2418] text-[#f7f1e6] shadow-[0_20px_44px_rgba(31,24,16,0.18)]"
                          : "border-[#ded4c6] bg-[#fcfaf5] text-[#2c2418] hover:border-[#8a7348] hover:bg-white"
                      }`}
                    >
                      <p className={`text-[11px] uppercase tracking-[0.22em] ${isActive ? "text-[#cabd9e]" : "text-[#7b6a4e]"}`}>
                        {zone.type}
                      </p>
                      <p className="mt-3 text-lg font-medium tracking-tight">{zone.name}</p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                        <span className={isActive ? "text-[#efe3cf]" : "text-[#6a5a44]"}>{zone.seats}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                            isActive ? "bg-white/10 text-[#f7f1e6]" : "bg-[#f2ebdf] text-[#6f5d45]"
                          }`}
                        >
                          {zone.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[#ddd2c4] bg-[linear-gradient(135deg,#faf7f0_0%,#efe7d9_100%)] shadow-[0_26px_60px_rgba(33,24,13,0.08)]">
                <div className="pointer-events-none absolute inset-0 opacity-50">
                  <div className="absolute left-[5%] top-[8%] h-[84%] w-[90%] rounded-[1.6rem] border border-dashed border-stone-400/45" />
                  <div className="absolute left-[43.5%] top-[8%] h-[84%] w-px bg-stone-400/25" />
                  <div className="absolute left-[5%] top-[46%] h-px w-[90%] bg-stone-400/25" />
                </div>

                <div className="pointer-events-none absolute left-[43%] top-[7%] h-[86%] w-[14%] rounded-[999px] bg-[linear-gradient(180deg,#c2b198,#b19e83)] opacity-80" />
                <div className="pointer-events-none absolute left-[6%] top-[44%] h-[12%] w-[88%] rounded-[999px] bg-[linear-gradient(90deg,#d8ccba,#cabaa2)] opacity-70" />
                <div className="pointer-events-none absolute inset-x-[8%] top-[10%] h-10 rounded-full bg-white/35 blur-2xl" />

                {zones.map((zone) => {
                  const isActive = hoveredZone.id === zone.id;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onMouseEnter={() => setHoveredZoneId(zone.id)}
                      onFocus={() => setHoveredZoneId(zone.id)}
                      className={`absolute overflow-hidden rounded-[1.4rem] border text-left transition-all duration-200 ${
                        isActive
                          ? "border-[#2c2418] bg-[#2c2418] text-white shadow-[0_26px_44px_rgba(0,0,0,0.18)]"
                          : "border-[#bba88a]/55 bg-white/82 text-stone-900 hover:border-[#8a7348]"
                      }`}
                      style={{
                        top: zone.top,
                        left: zone.left,
                        width: zone.width,
                        height: zone.height,
                      }}
                    >
                      <div className="flex h-full flex-col justify-between p-4">
                        <div>
                          <p className={`text-[11px] uppercase tracking-[0.18em] ${isActive ? "text-stone-300" : "text-stone-500"}`}>
                            {zone.type}
                          </p>
                          <p className="mt-2 text-lg font-medium tracking-tight">{zone.name}</p>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <p className={`text-sm ${isActive ? "text-stone-200" : "text-stone-600"}`}>{zone.seats}</p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                              isActive ? "bg-white/10 text-white" : "bg-[#f1ebdf] text-[#6f5d45]"
                            }`}
                          >
                            {zone.price}
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

        <aside className="border border-border bg-secondary/30">
          <div className="border-b border-border px-6 py-5">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Hover insight</p>
            <h3 className="mt-2 text-2xl font-medium tracking-tight">{hoveredZone.name}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Live-style availability preview for desks, private offices, and team zones inside {activeLocation.name}.
            </p>
          </div>

          <div className="grid gap-4 p-6">
            <div className="border border-border bg-background p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Occupancy</p>
              <p className="mt-3 text-xl font-medium tracking-tight">{hoveredZone.occupancy}</p>
            </div>
            <div className="border border-border bg-background p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</p>
              <p className="mt-3 text-xl font-medium tracking-tight">{hoveredZone.price}</p>
            </div>
            <div className="border border-border bg-background p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
              <p className="mt-3 text-xl font-medium tracking-tight">{hoveredZone.status}</p>
            </div>

            <div className="border border-border bg-background p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">District</p>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {getDistrictLabel(activeLocation.id)}, {activeLocation.address}
              </p>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.55fr_0.9fr]">
      <div className="border border-[#d9d1c4] bg-[#fbf8f1] shadow-[0_28px_80px_rgba(37,28,16,0.08)]">
        <div className="border-b border-[#e5ddcf] px-7 py-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Step 1</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground">
            Explore Moscow and choose the right workspace
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            This view is focused on one city. Compare districts, hover each office for demand signals, and open the location that fits your team or meeting best.
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

      <aside className="border border-[#d9d1c4] bg-[#f4efe4] shadow-[0_28px_80px_rgba(37,28,16,0.08)]">
        <div className="border-b border-[#e5ddcf] px-6 py-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Location preview</p>
          <h3 className="mt-3 text-3xl font-medium tracking-tight">{activeLocation.name}</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Hover a point on the Moscow map to preview occupancy, pricing, and activity before opening the detailed floor plan.
          </p>
        </div>

        <div className="grid gap-4 p-6">
          <div className="border border-[#e3dacb] bg-[#2c2418] p-5 text-[#f7f1e6] shadow-[0_18px_42px_rgba(36,27,15,0.12)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#cabd9e]">District</p>
            <p className="mt-3 text-2xl font-medium tracking-tight">{getDistrictLabel(activeLocation.id)}</p>
            <p className="mt-2 text-sm text-[#e8dcc2]">{activeLocation.address}</p>
          </div>

          <div className="border border-[#e3dacb] bg-[#fcfaf5] p-5 shadow-[0_14px_30px_rgba(36,27,15,0.04)]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.2em]">Occupancy</p>
            </div>
            <p className="mt-3 text-xl font-medium tracking-tight">{activeLocation.occupancy}</p>
          </div>

          <div className="border border-[#e3dacb] bg-[#fcfaf5] p-5 shadow-[0_14px_30px_rgba(36,27,15,0.04)]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.2em]">Desk price</p>
            </div>
            <p className="mt-3 text-xl font-medium tracking-tight">{activeLocation.deskPrice}</p>
            <p className="mt-2 text-sm text-muted-foreground">Meeting rooms from {activeLocation.roomPrice}</p>
          </div>

          <div className="border border-[#e3dacb] bg-[#fcfaf5] p-5 shadow-[0_14px_30px_rgba(36,27,15,0.04)]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.2em]">Activity</p>
            </div>
            <p className="mt-3 text-xl font-medium tracking-tight">{activeLocation.members}</p>
            <p className="mt-2 text-sm text-muted-foreground">Inside {CITY_NAME}, ready for same-city booking flow.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
