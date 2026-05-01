import type { PrismaClient } from '@prisma/client'

const rubPerDollar = 100

const locationDefs = [
  { id: 'patriarchy', name: 'Patriarchy Clubhouse', address: '18 Malaya Bronnaya Street', occupancy: '78% occupied', members: '164 active members' },
  { id: 'belorusskaya', name: 'Belorusskaya Hub', address: '34 Lesnaya Street', occupancy: '66% occupied', members: '119 active members' },
  { id: 'paveletskaya', name: 'Paveletskaya Loft', address: '5 Letnikovskaya Street', occupancy: '72% occupied', members: '141 active members' },
  { id: 'city-north', name: 'Moscow City North Tower', address: '12 Presnenskaya Embankment', occupancy: '84% occupied', members: '196 active members' },
  { id: 'kurskaya', name: 'Kurskaya Yard', address: '11 Zemlyanoy Val', occupancy: '69% occupied', members: '132 active members' },
  { id: 'park-kultury', name: 'Park Kultury House', address: '21 Zubovsky Boulevard', occupancy: '63% occupied', members: '108 active members' },
  { id: 'tverskaya', name: 'Tverskaya Rooms', address: '7 Tverskaya Street', occupancy: '76% occupied', members: '155 active members' },
  { id: 'chistye-prudy', name: 'Chistye Prudy Corner', address: '19 Myasnitskaya Street', occupancy: '64% occupied', members: '97 active members' },
  { id: 'taganskaya', name: 'Taganskaya Point', address: '3 Taganskaya Square', occupancy: '67% occupied', members: '116 active members' },
  { id: 'sokol', name: 'Sokol Studio', address: '14 Leningradsky Avenue', occupancy: '58% occupied', members: '89 active members' },
]

const resourceDefs: Array<{ locationId: string; name: string; type: string; seats: string; occupancy: string; price: string; status: string }> = [
  { locationId: 'patriarchy', name: 'Library Desks', type: 'desk', seats: '12 desks', occupancy: '10 of 12 occupied', price: '$390/desk/month', status: 'Only 2 desks left' },
  { locationId: 'patriarchy', name: 'Founder Office', type: 'office', seats: '6 seats', occupancy: '4 of 6 occupied', price: '$1460/month', status: 'Available now' },
  { locationId: 'belorusskaya', name: 'Launch Pad', type: 'desk', seats: '16 desks', occupancy: '9 of 16 occupied', price: '$330/desk/month', status: 'Available now' },
  { locationId: 'belorusskaya', name: 'Transit Office', type: 'office', seats: '4 seats', occupancy: '2 of 4 occupied', price: '$1080/month', status: 'Available tomorrow' },
  { locationId: 'paveletskaya', name: 'Riverside Pod', type: 'team', seats: '10 desks', occupancy: '8 of 10 occupied', price: '$365/desk/month', status: 'High demand' },
  { locationId: 'paveletskaya', name: 'Bridge Office', type: 'office', seats: '5 seats', occupancy: '4 of 5 occupied', price: '$1390/month', status: 'One seat opens Friday' },
  { locationId: 'city-north', name: 'Skyline Pod', type: 'desk', seats: '14 desks', occupancy: '12 of 14 occupied', price: '$430/desk/month', status: 'Premium demand' },
  { locationId: 'city-north', name: 'Corner Office', type: 'office', seats: '6 seats', occupancy: '5 of 6 occupied', price: '$1720/month', status: 'Available next Monday' },
  { locationId: 'kurskaya', name: 'Switchyard Desks', type: 'desk', seats: '15 desks', occupancy: '9 of 15 occupied', price: '$320/desk/month', status: 'Available now' },
  { locationId: 'sokol', name: 'Airline Desks', type: 'desk', seats: '12 desks', occupancy: '6 of 12 occupied', price: '$270/desk/month', status: 'Low pressure' },
]

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const count = await prisma.location.count()
  if (count > 0) return

  for (const loc of locationDefs) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, city: 'Moscow' },
    })
  }

  let idx = 1
  for (const r of resourceDefs) {
    const price = parsePrice(r.price)
    await prisma.resource.upsert({
      where: { id: `r${idx}` },
      update: {},
      create: {
        id: `r${idx}`,
        locationId: r.locationId,
        name: r.name,
        type: r.type,
        seats: r.seats,
        occupancy: r.occupancy,
        priceLabel: formatRub(price),
        priceMinorUnits: price,
        status: r.status,
      },
    })
    idx++
  }

  console.log('booking-service: database seeded')
}

function parsePrice(s: string): number {
  const match = s.match(/[\d,]+/)
  const amount = Number(match?.[0]?.replaceAll(',', '') ?? 0)
  const rub = s.includes('$') ? amount * rubPerDollar : amount
  return rub * 100
}

function formatRub(minor: number): string {
  const rub = minor / 100
  return `${new Intl.NumberFormat('ru-RU').format(rub)} ₽ / month`
}
