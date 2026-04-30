export type ResourceType = 'desk' | 'office' | 'room' | 'team'

export type LocationResponse = {
  id: string
  address: string
  city: string
  members: string
  name: string
  occupancy: string
}

export type ResourceResponse = {
  id: string
  locationId: string
  name: string
  occupancy: string
  priceLabel: string
  priceMinorUnits: number
  seats: string
  status: string
  type: ResourceType
}

export type AvailableSlotResponse = {
  id: string
  endsAt: string
  label: string
  resourceId: string
  startsAt: string
}

export type UpdateLocationRequest = {
  members?: string
  occupancy?: string
}

export type UpdateResourceRequest = {
  occupancy?: string
  priceLabel?: string
  priceMinorUnits?: number
  status?: string
}
