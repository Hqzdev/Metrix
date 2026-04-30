import type {
  AvailableSlotResponse,
  LocationResponse,
  ResourceResponse,
} from '../../contracts/resources.js'

type DbLocation = {
  id: string
  address: string
  city: string
  members: string
  name: string
  occupancy: string
}

type DbResource = {
  id: string
  locationId: string
  name: string
  occupancy: string
  priceLabel: string
  priceMinorUnits: number
  seats: string
  status: string
  type: 'desk' | 'office' | 'room' | 'team'
}

type DbSlot = {
  id: string
  endsAt: Date
  label: string
  resourceId: string
  startsAt: Date
}

// приводит prisma location к api contract
export function mapLocation(location: DbLocation): LocationResponse {
  return {
    id: location.id,
    address: location.address,
    city: location.city,
    members: location.members,
    name: location.name,
    occupancy: location.occupancy,
  }
}

// приводит prisma resource к api contract
export function mapResource(resource: DbResource): ResourceResponse {
  return {
    id: resource.id,
    locationId: resource.locationId,
    name: resource.name,
    occupancy: resource.occupancy,
    priceLabel: resource.priceLabel,
    priceMinorUnits: resource.priceMinorUnits,
    seats: resource.seats,
    status: resource.status,
    type: resource.type,
  }
}

// приводит prisma slot к api contract
export function mapSlot(slot: DbSlot): AvailableSlotResponse {
  return {
    id: slot.id,
    endsAt: slot.endsAt.toISOString(),
    label: slot.label,
    resourceId: slot.resourceId,
    startsAt: slot.startsAt.toISOString(),
  }
}
