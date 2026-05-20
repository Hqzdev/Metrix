import type { PrismaClient } from '@prisma/client'

const rubPerDollar = 100
const roomsPerLocation = 10

const locationDefs = [
  { id: 'patriarchy', name: 'Patriarchy Clubhouse', address: '18 Malaya Bronnaya Street' },
  { id: 'belorusskaya', name: 'Belorusskaya Hub', address: '34 Lesnaya Street' },
  { id: 'paveletskaya', name: 'Paveletskaya Loft', address: '5 Letnikovskaya Street' },
  { id: 'city-north', name: 'Moscow City North Tower', address: '12 Presnenskaya Embankment' },
  { id: 'kurskaya', name: 'Kurskaya Yard', address: '11 Zemlyanoy Val' },
  { id: 'park-kultury', name: 'Park Kultury House', address: '21 Zubovsky Boulevard' },
  { id: 'tverskaya', name: 'Tverskaya Rooms', address: '7 Tverskaya Street' },
  { id: 'chistye-prudy', name: 'Chistye Prudy Corner', address: '19 Myasnitskaya Street' },
  { id: 'taganskaya', name: 'Taganskaya Point', address: '3 Taganskaya Square' },
  { id: 'sokol', name: 'Sokol Studio', address: '14 Leningradsky Avenue' },
]

const roomNames = ['Focus', 'Board', 'Studio', 'Garden', 'Library', 'Skyline', 'Transit', 'Atrium', 'Summit', 'Courtyard']
const roomTypes = ['office', 'room', 'team', 'room', 'desk', 'office', 'room', 'team', 'room', 'desk']
const seatLabels = ['2 seats', '4 seats', '6 seats', '8 seats', '10 seats', '3 seats', '5 seats', '7 seats', '12 seats', '1 desk']

type SeedLogger = {
  info(entry: { message: string; service: 'booking-service'; [key: string]: unknown }): void
}

/**
 * Заполняет пустую базу стартовыми локациями и ресурсами.
 */
export async function seedDatabase(prisma: PrismaClient, logger?: SeedLogger): Promise<void> {
  const resourceDefs = buildResourceDefs()

  for (const loc of locationDefs) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {
        address: loc.address,
        members: '0 active bookings',
        name: loc.name,
        occupancy: `0/${roomsPerLocation} booked`,
      },
      create: { ...loc, city: 'Moscow', members: '0 active bookings', occupancy: `0/${roomsPerLocation} booked` },
    })
  }

  for (const r of resourceDefs) {
    const price = parsePrice(r.price)
    await prisma.resource.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        type: r.type,
        seats: r.seats,
        occupancy: '0 bookings',
        priceLabel: formatRub(price),
        priceMinorUnits: price,
        status: 'Available',
      },
      create: {
        id: r.id,
        locationId: r.locationId,
        name: r.name,
        type: r.type,
        seats: r.seats,
        occupancy: '0 bookings',
        priceLabel: formatRub(price),
        priceMinorUnits: price,
        status: 'Available',
      },
    })
  }

  logger?.info({
    action: 'database.seed',
    message: 'Booking seed data created',
    service: 'booking-service',
  })
}

function buildResourceDefs(): Array<{ id: string; locationId: string; name: string; type: string; seats: string; price: string }> {
  return locationDefs.flatMap((location) =>
    Array.from({ length: roomsPerLocation }, (_, index) => {
      const roomNumber = index + 1
      const padded = String(roomNumber).padStart(2, '0')
      const price = 1200 + roomNumber * 150

      return {
        id: `${location.id}-room-${padded}`,
        locationId: location.id,
        name: `${roomNames[index]} Room ${roomNumber}`,
        type: roomTypes[index],
        seats: seatLabels[index],
        price: `${price}/hour`,
      }
    }),
  )
}

/**
 * Парсит и валидирует входное значение.
 */
function parsePrice(s: string): number {
  const match = s.match(/[\d,]+/)
  const amount = Number(match?.[0]?.replaceAll(',', '') ?? 0)
  const rub = s.includes('$') ? amount * rubPerDollar : amount
  return rub * 100
}

/**
 * Форматирует минорные единицы в человекочитаемую цену в рублях.
 */
function formatRub(minor: number): string {
  const rub = minor / 100
  return `${new Intl.NumberFormat('ru-RU').format(rub)} ₽ / month`
}
