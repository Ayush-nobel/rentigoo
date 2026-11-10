import type { Area, RegionId } from './types'

export const REGIONS: Record<RegionId, string> = {
  bhopal: 'Bhopal',
}

/** Launch city: Bhopal, Madhya Pradesh. */
export const LAUNCH_CITY = 'Bhopal'

export const AREAS: Area[] = [
  { id: 'mp-nagar', name: 'MP Nagar', region: 'bhopal' },
  { id: 'arera-colony', name: 'Arera Colony', region: 'bhopal' },
  { id: 'new-market', name: 'New Market', region: 'bhopal' },
  { id: 'shahpura', name: 'Shahpura', region: 'bhopal' },
  { id: 'kolar-road', name: 'Kolar Road', region: 'bhopal' },
  { id: 'habibganj', name: 'Habibganj', region: 'bhopal' },
]

const byId = new Map(AREAS.map((a) => [a.id, a]))

export function getArea(id: string): Area | undefined {
  return byId.get(id)
}

export function areaName(id: string): string {
  return byId.get(id)?.name ?? LAUNCH_CITY
}
