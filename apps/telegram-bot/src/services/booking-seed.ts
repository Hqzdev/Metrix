import type { Booking, BookingLocation, BookingResource, ResourceType } from './booking-service.js'

const rublesPerDollar = 100

export const locations: BookingLocation[] = [
  {
    id: 'patriarchy',
    name: 'Patriarchy Clubhouse',
    city: 'Moscow',
    address: '18 Malaya Bronnaya Street',
    occupancy: '78% occupied',
    members: '164 active members',
  },
  {
    id: 'belorusskaya',
    name: 'Belorusskaya Hub',
    city: 'Moscow',
    address: '34 Lesnaya Street',
    occupancy: '66% occupied',
    members: '119 active members',
  },
  {
    id: 'paveletskaya',
    name: 'Paveletskaya Loft',
    city: 'Moscow',
    address: '5 Letnikovskaya Street',
    occupancy: '72% occupied',
    members: '141 active members',
  },
  {
    id: 'city-north',
    name: 'Moscow City North Tower',
    city: 'Moscow',
    address: '12 Presnenskaya Embankment',
    occupancy: '84% occupied',
    members: '196 active members',
  },
  {
    id: 'kurskaya',
    name: 'Kurskaya Yard',
    city: 'Moscow',
    address: '11 Zemlyanoy Val',
    occupancy: '69% occupied',
    members: '132 active members',
  },
  {
    id: 'park-kultury',
    name: 'Park Kultury House',
    city: 'Moscow',
    address: '21 Zubovsky Boulevard',
    occupancy: '63% occupied',
    members: '108 active members',
  },
  {
    id: 'tverskaya',
    name: 'Tverskaya Rooms',
    city: 'Moscow',
    address: '7 Tverskaya Street',
    occupancy: '76% occupied',
    members: '155 active members',
  },
  {
    id: 'chistye-prudy',
    name: 'Chistye Prudy Corner',
    city: 'Moscow',
    address: '19 Myasnitskaya Street',
    occupancy: '64% occupied',
    members: '97 active members',
  },
  {
    id: 'taganskaya',
    name: 'Taganskaya Point',
    city: 'Moscow',
    address: '3 Taganskaya Square',
    occupancy: '67% occupied',
    members: '116 active members',
  },
  {
    id: 'sokol',
    name: 'Sokol Studio',
    city: 'Moscow',
    address: '14 Leningradsky Avenue',
    occupancy: '58% occupied',
    members: '89 active members',
  },
]

const rawResourcesByLocationId: Record<
  string,
  Array<{
    name: string
    occupancy: string
    price: string
    seats: string
    status: string
    type: string
  }>
> = {
  patriarchy: [
    resource('Library Desks', 'Quiet shared zone', '12 desks', '10 of 12 occupied', '$390 / desk / month', 'Only 2 desks left'),
    resource('Founder Office', 'Private office', '6 seats', '4 of 6 occupied', '$1,460 / month', 'Available now'),
    resource('Garden Meeting Suite', 'Meeting room', '8 seats', 'Booked 58% this week', '$32 / hour', 'Open after 2 PM'),
    resource('Courtyard Bench', 'Focused desk zone', '14 desks', '7 of 14 occupied', '$34 / day', 'Best same-day option'),
    resource('Editorial Studio', 'Shared team area', '10 desks', '8 of 10 occupied', '$360 / desk / month', 'High demand'),
  ],
  belorusskaya: [
    resource('Launch Pad', 'Shared team area', '16 desks', '9 of 16 occupied', '$330 / desk / month', 'Available now'),
    resource('Transit Office', 'Private office', '4 seats', '2 of 4 occupied', '$1,080 / month', 'Available tomorrow'),
    resource('Rail Meeting Room', 'Meeting room', '12 seats', 'Booked 49% this week', '$27 / hour', 'Open after 5 PM'),
    resource('Hot Desk Boulevard', 'Desk strip', '18 desks', '12 of 18 occupied', '$29 / day', 'Steady traffic'),
    resource('Client Sprint Pod', 'Team pod', '8 desks', '6 of 8 occupied', '$345 / desk / month', 'High demand'),
  ],
  paveletskaya: [
    resource('Riverside Pod', 'Team pod', '10 desks', '8 of 10 occupied', '$365 / desk / month', 'High demand'),
    resource('Bridge Office', 'Private office', '5 seats', '4 of 5 occupied', '$1,390 / month', 'One seat opens Friday'),
    resource('Investor Room', 'Meeting room', '10 seats', 'Booked 63% this week', '$31 / hour', 'Limited availability'),
    resource('Dockline Desks', 'Desk zone', '20 desks', '9 of 20 occupied', '$31 / day', 'Fastest check-in'),
    resource('Build Room', 'Private team room', '9 seats', '7 of 9 occupied', '$1,980 / month', 'Opens next week'),
  ],
  'city-north': [
    resource('Skyline Pod', 'Executive team zone', '14 desks', '12 of 14 occupied', '$430 / desk / month', 'Premium demand'),
    resource('Corner Office', 'Private office', '6 seats', '5 of 6 occupied', '$1,720 / month', 'Available next Monday'),
    resource('Summit Room', 'Boardroom', '12 seats', 'Booked 71% this week', '$38 / hour', 'Morning slots only'),
    resource('Panorama Desks', 'Flex desk zone', '18 desks', '11 of 18 occupied', '$39 / day', 'Balanced occupancy'),
    resource('Finance Suite', 'Private team room', '10 seats', '8 of 10 occupied', '$2,140 / month', 'Tour required'),
  ],
  kurskaya: [
    resource('Switchyard Desks', 'Shared work zone', '15 desks', '9 of 15 occupied', '$320 / desk / month', 'Available now'),
    resource('Brick Office', 'Private office', '5 seats', '3 of 5 occupied', '$1,220 / month', 'Ready this week'),
    resource('Cargo Room', 'Meeting room', '10 seats', 'Booked 46% this week', '$28 / hour', 'Open after 1 PM'),
    resource('Ring Desks', 'Desk zone', '18 desks', '10 of 18 occupied', '$30 / day', 'Balanced demand'),
    resource('Station Pod', 'Team pod', '8 desks', '6 of 8 occupied', '$350 / desk / month', 'High demand'),
  ],
  'park-kultury': [
    resource('Garden Desks', 'Quiet work zone', '14 desks', '7 of 14 occupied', '$300 / desk / month', 'Best availability'),
    resource('Boulevard Office', 'Private office', '4 seats', '2 of 4 occupied', '$1,090 / month', 'Available tomorrow'),
    resource('Atrium Room', 'Meeting room', '8 seats', 'Booked 41% this week', '$24 / hour', 'Open all afternoon'),
    resource('River Lane', 'Flex desk zone', '16 desks', '8 of 16 occupied', '$28 / day', 'Low pressure'),
    resource('Wellness Suite', 'Private team room', '7 seats', '5 of 7 occupied', '$1,540 / month', 'Tour available'),
  ],
  tverskaya: [
    resource('Avenue Desks', 'Shared desk zone', '14 desks', '11 of 14 occupied', '$360 / desk / month', 'High demand'),
    resource('Central Office', 'Private office', '5 seats', '3 of 5 occupied', '$1,340 / month', 'Available now'),
    resource('Boulevard Room', 'Meeting room', '10 seats', 'Booked 54% this week', '$29 / hour', 'Open after 4 PM'),
    resource('Rush Line', 'Desk zone', '18 desks', '12 of 18 occupied', '$33 / day', 'Peak demand'),
    resource('Client Suite', 'Team room', '8 seats', '6 of 8 occupied', '$1,620 / month', 'Tour required'),
  ],
  'chistye-prudy': [
    resource('Pond Desks', 'Quiet work zone', '13 desks', '7 of 13 occupied', '$285 / desk / month', 'Good availability'),
    resource('Heritage Office', 'Private office', '4 seats', '2 of 4 occupied', '$1,040 / month', 'Available now'),
    resource('Reading Room', 'Meeting room', '8 seats', 'Booked 39% this week', '$22 / hour', 'Open all day'),
    resource('Tram Desks', 'Desk strip', '16 desks', '9 of 16 occupied', '$27 / day', 'Steady demand'),
    resource('Prudy Pod', 'Team pod', '7 desks', '4 of 7 occupied', '$298 / desk / month', 'Flexible access'),
  ],
  taganskaya: [
    resource('Ring Hub', 'Shared team area', '15 desks', '10 of 15 occupied', '$312 / desk / month', 'Available now'),
    resource('Square Office', 'Private office', '5 seats', '4 of 5 occupied', '$1,180 / month', 'One seat free'),
    resource('Forum Room', 'Meeting room', '9 seats', 'Booked 52% this week', '$25 / hour', 'Open after 6 PM'),
    resource('East Desks', 'Desk zone', '17 desks', '11 of 17 occupied', '$29 / day', 'Balanced demand'),
    resource('Tagan Pod', 'Private team room', '8 seats', '6 of 8 occupied', '$1,470 / month', 'Opens Friday'),
  ],
  sokol: [
    resource('Airline Desks', 'Shared desk zone', '12 desks', '6 of 12 occupied', '$270 / desk / month', 'Low pressure'),
    resource('Runway Office', 'Private office', '4 seats', '2 of 4 occupied', '$990 / month', 'Available now'),
    resource('North Room', 'Meeting room', '7 seats', 'Booked 35% this week', '$21 / hour', 'Open all afternoon'),
    resource('Sokol Line', 'Flex desk zone', '14 desks', '6 of 14 occupied', '$26 / day', 'Best value'),
    resource('Crew Suite', 'Team room', '6 seats', '3 of 6 occupied', '$1,260 / month', 'Tour available'),
  ],
}

export const resources: BookingResource[] = createResources()

// вспомогательная функция для создания raw-объекта ресурса
function resource(name: string, type: string, seats: string, occupancy: string, price: string, status: string) {
  return { name, type, seats, occupancy, price, status }
}

// создаёт плоский список BookingResource из rawResourcesByLocationId
function createResources(): BookingResource[] {
  let resourceIndex = 1

  return Object.entries(rawResourcesByLocationId).flatMap(([locationId, items]) =>
    items.map<BookingResource>((item) => ({
      id: `r${resourceIndex++}`,
      locationId,
      name: item.name,
      type: parseResourceType(item.type),
      seats: item.seats,
      occupancy: item.occupancy,
      priceLabel: formatRubPriceLabel(item.price),
      priceMinorUnits: parsePriceMinorUnits(item.price),
      status: item.status,
    })),
  )
}

// нормализует старые цены в долларах в рублевые цены
export function normalizeResourcePrices(items: BookingResource[]): void {
  for (const item of items) {
    if (item.priceLabel.includes('$')) {
      item.priceMinorUnits = parsePriceMinorUnits(item.priceLabel)
      item.priceLabel = formatRubPriceLabel(item.priceLabel)
    }
  }
}

// нормализует старые цены броней в долларах в рублевые цены
export function normalizeBookingPrices(items: Booking[]): void {
  for (const item of items) {
    if (item.priceLabel.includes('$')) {
      item.paidAmountMinorUnits = parsePriceMinorUnits(item.priceLabel)
      item.priceLabel = formatRubPriceLabel(item.priceLabel)
    }
  }
}

// определяет тип ресурса по строке описания
function parseResourceType(type: string): ResourceType {
  const lowerType = type.toLowerCase()

  if (lowerType.includes('meeting') || lowerType.includes('room') || lowerType.includes('boardroom')) {
    return 'room'
  }

  if (lowerType.includes('office')) {
    return 'office'
  }

  if (lowerType.includes('pod') || lowerType.includes('team')) {
    return 'team'
  }

  return 'desk'
}

// конвертирует строку с ценой в минорные единицы
function parsePriceMinorUnits(price: string): number {
  const amount = parsePriceAmount(price)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Unable to parse booking price: ${price}`)
  }

  const rubAmount = price.includes('$') ? amount * rublesPerDollar : amount
  return rubAmount * 100
}

// форматирует условную долларовую цену как цену в рублях
function formatRubPriceLabel(price: string): string {
  const amount = parsePriceAmount(price)
  const suffix = price.replace(/^\$?[\d,]+/, '')
  const rubAmount = price.includes('$') ? amount * rublesPerDollar : amount

  return `${formatRubAmount(rubAmount)} ₽${suffix}`
}

// достаёт числовую часть цены из строки
function parsePriceAmount(price: string): number {
  return Number(price.match(/[\d,\s]+/)?.[0]?.replaceAll(',', '').replaceAll(' ', '') ?? 0)
}

// добавляет пробелы в большие суммы
function formatRubAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount).replaceAll(' ', ' ')
}
