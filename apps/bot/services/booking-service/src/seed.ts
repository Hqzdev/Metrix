import type { PrismaClient } from '@prisma/client'

// Условный курс для старых seed-цен в долларах.
const rubPerDollar = 100
// Сколько комнат создаём на каждую локацию.
const roomsPerLocation = 10

// Стартовый список локаций для демо/локальной базы.
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

// Наборы значений ниже используются по индексу, чтобы собрать 10 комнат на локацию.
const roomNames = ['Focus', 'Board', 'Studio', 'Garden', 'Library', 'Skyline', 'Transit', 'Atrium', 'Summit', 'Courtyard']
const roomTypes = ['office', 'room', 'team', 'room', 'desk', 'office', 'room', 'team', 'room', 'desk']
const seatLabels = ['2 seats', '4 seats', '6 seats', '8 seats', '10 seats', '3 seats', '5 seats', '7 seats', '12 seats', '1 desk']

// Минимальный интерфейс логгера, чтобы seed не зависел от конкретного класса.
type SeedLogger = {
  info(entry: { message: string; service: 'booking-service'; [key: string]: unknown }): void
} 

/**
 * Заполняет пустую базу стартовыми локациями и ресурсами.
 */
export async function seedDatabase(prisma: PrismaClient, logger?: SeedLogger): Promise<void> {
  // Сначала строим список комнат для всех локаций.
  const resourceDefs = buildResourceDefs()

  // upsert создаёт локацию, если её нет, или обновляет базовые поля.
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

  // Для каждой комнаты создаём или обновляем Resource.
  for (const r of resourceDefs) {
    // priceMinorUnits храним в копейках.
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

  // Лог полезен при старте, чтобы видеть, что seed прошёл.
  logger?.info({
    action: 'database.seed',
    message: 'Booking seed data created',
    service: 'booking-service',
  })
}

/**
 * Строит список комнат для каждой seed-локации.
 */
function buildResourceDefs(): Array<{ id: string; locationId: string; name: string; type: string; seats: string; price: string }> {
  return locationDefs.flatMap((location) =>
    Array.from({ length: roomsPerLocation }, (_, index) => {
      // Нумерация комнат начинается с 1, а индекс массива с 0.
      const roomNumber = index + 1
      // 01, 02, 03 нужны для стабильной сортировки id.
      const padded = String(roomNumber).padStart(2, '0')
      // Цена немного растёт от номера комнаты.
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
  // Забираем первую числовую часть из строки цены.
  const match = s.match(/[\d,]+/)
  const amount = Number(match?.[0]?.replaceAll(',', '') ?? 0)
  // Старые значения с $ переводим в рубли по условному курсу.
  const rub = s.includes('$') ? amount * rubPerDollar : amount
  // В базе цена хранится в minor units, то есть в копейках.
  return rub * 100
}

/**
 * Форматирует минорные единицы в человекочитаемую цену в рублях.
 */
function formatRub(minor: number): string {
  // Переводим копейки обратно в рубли для отображения.
  const rub = minor / 100
  return `${new Intl.NumberFormat('ru-RU').format(rub)} ₽ / month`
}
