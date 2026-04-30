import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const rublesPerDollar = 100

const locations = [
  location('patriarchy', 'Patriarchy Clubhouse', 'Moscow', '18 Malaya Bronnaya Street', '78% occupied', '164 active members'),
  location('belorusskaya', 'Belorusskaya Hub', 'Moscow', '34 Lesnaya Street', '66% occupied', '119 active members'),
  location('paveletskaya', 'Paveletskaya Loft', 'Moscow', '5 Letnikovskaya Street', '72% occupied', '141 active members'),
  location('city-north', 'Moscow City North Tower', 'Moscow', '12 Presnenskaya Embankment', '84% occupied', '196 active members'),
  location('kurskaya', 'Kurskaya Yard', 'Moscow', '11 Zemlyanoy Val', '69% occupied', '132 active members'),
  location('park-kultury', 'Park Kultury House', 'Moscow', '21 Zubovsky Boulevard', '63% occupied', '108 active members'),
  location('tverskaya', 'Tverskaya Rooms', 'Moscow', '7 Tverskaya Street', '76% occupied', '155 active members'),
  location('chistye-prudy', 'Chistye Prudy Corner', 'Moscow', '19 Myasnitskaya Street', '64% occupied', '97 active members'),
  location('taganskaya', 'Taganskaya Point', 'Moscow', '3 Taganskaya Square', '67% occupied', '116 active members'),
  location('sokol', 'Sokol Studio', 'Moscow', '14 Leningradsky Avenue', '58% occupied', '89 active members'),
]

const resources = [
  resource('r1', 'patriarchy', 'Library Desks', 'desk', '12 desks', '10 of 12 occupied', '$390 / desk / month', 'Only 2 desks left'),
  resource('r2', 'patriarchy', 'Founder Office', 'office', '6 seats', '4 of 6 occupied', '$1,460 / month', 'Available now'),
  resource('r3', 'patriarchy', 'Garden Meeting Suite', 'room', '8 seats', 'Booked 58% this week', '$32 / hour', 'Open after 2 PM'),
  resource('r4', 'patriarchy', 'Courtyard Bench', 'desk', '14 desks', '7 of 14 occupied', '$34 / day', 'Best same-day option'),
  resource('r5', 'patriarchy', 'Editorial Studio', 'team', '10 desks', '8 of 10 occupied', '$360 / desk / month', 'High demand'),
  resource('r6', 'belorusskaya', 'Launch Pad', 'team', '16 desks', '9 of 16 occupied', '$330 / desk / month', 'Available now'),
  resource('r7', 'belorusskaya', 'Transit Office', 'office', '4 seats', '2 of 4 occupied', '$1,080 / month', 'Available tomorrow'),
  resource('r8', 'belorusskaya', 'Rail Meeting Room', 'room', '12 seats', 'Booked 49% this week', '$27 / hour', 'Open after 5 PM'),
  resource('r9', 'belorusskaya', 'Hot Desk Boulevard', 'desk', '18 desks', '12 of 18 occupied', '$29 / day', 'Steady traffic'),
  resource('r10', 'belorusskaya', 'Client Sprint Pod', 'team', '8 desks', '6 of 8 occupied', '$345 / desk / month', 'High demand'),
  resource('r11', 'paveletskaya', 'Riverside Pod', 'team', '10 desks', '8 of 10 occupied', '$365 / desk / month', 'High demand'),
  resource('r12', 'paveletskaya', 'Bridge Office', 'office', '5 seats', '4 of 5 occupied', '$1,390 / month', 'One seat opens Friday'),
  resource('r13', 'paveletskaya', 'Investor Room', 'room', '10 seats', 'Booked 63% this week', '$31 / hour', 'Limited availability'),
  resource('r14', 'paveletskaya', 'Dockline Desks', 'desk', '20 desks', '9 of 20 occupied', '$31 / day', 'Fastest check-in'),
  resource('r15', 'paveletskaya', 'Build Room', 'team', '9 seats', '7 of 9 occupied', '$1,980 / month', 'Opens next week'),
]

// запускает seed для локальной базы
async function main(): Promise<void> {
  await prisma.user.upsert({
    create: {
      email: 'admin@metrix.local',
      name: 'Metrix Admin',
      role: 'admin',
    },
    update: {},
    where: { email: 'admin@metrix.local' },
  })

  for (const item of locations) {
    await prisma.location.upsert({
      create: item,
      update: item,
      where: { id: item.id },
    })
  }

  for (const item of resources) {
    await prisma.resource.upsert({
      create: item,
      update: item,
      where: { id: item.id },
    })
    await seedSlots(item.id)
  }
}

// создаёт три базовых слота для ресурса
async function seedSlots(resourceId: string): Promise<void> {
  const today = new Date()
  today.setMinutes(0, 0, 0)

  const slots = [
    slot(resourceId, 'm', today, 9, 12, '09:00 - 12:00'),
    slot(resourceId, 'a', today, 13, 17, '13:00 - 17:00'),
    slot(resourceId, 'e', today, 18, 21, '18:00 - 21:00'),
  ]

  for (const item of slots) {
    await prisma.slot.upsert({
      create: item,
      update: item,
      where: { id: item.id },
    })
  }
}

function location(id: string, name: string, city: string, address: string, occupancy: string, members: string) {
  return { id, name, city, address, occupancy, members }
}

function resource(
  id: string,
  locationId: string,
  name: string,
  type: 'desk' | 'office' | 'room' | 'team',
  seats: string,
  occupancy: string,
  price: string,
  status: string,
) {
  return {
    id,
    locationId,
    name,
    type,
    seats,
    occupancy,
    priceLabel: formatRubPriceLabel(price),
    priceMinorUnits: parsePriceMinorUnits(price),
    status,
  }
}

function slot(resourceId: string, suffix: string, baseDate: Date, startHour: number, endHour: number, label: string) {
  const startsAt = new Date(baseDate)
  startsAt.setHours(startHour, 0, 0, 0)
  const endsAt = new Date(baseDate)
  endsAt.setHours(endHour, 0, 0, 0)

  return {
    id: `${resourceId}${suffix}`,
    resourceId,
    startsAt,
    endsAt,
    label,
  }
}

function parsePriceMinorUnits(price: string): number {
  const amount = Number(price.match(/[\d,]+/)?.[0]?.replaceAll(',', '') ?? 0)
  return amount * rublesPerDollar * 100
}

function formatRubPriceLabel(price: string): string {
  const amount = Number(price.match(/[\d,]+/)?.[0]?.replaceAll(',', '') ?? 0)
  const suffix = price.replace(/^\$?[\d,]+/, '')
  const rubAmount = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
    .format(amount * rublesPerDollar)
    .replaceAll(' ', ' ')

  return `${rubAmount} ₽${suffix}`
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
