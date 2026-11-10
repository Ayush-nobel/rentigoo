import type { Area, RegionId } from './types'

export const REGIONS: Record<RegionId, string> = {
  delhi: 'Delhi',
  noida: 'Noida',
  gurugram: 'Gurugram',
  ghaziabad: 'Ghaziabad',
  faridabad: 'Faridabad',
}

export const AREAS: Area[] = [
  { id: 'south-delhi', name: 'South Delhi', region: 'delhi' },
  { id: 'north-delhi', name: 'North Delhi', region: 'delhi' },
  { id: 'east-delhi', name: 'East Delhi', region: 'delhi' },
  { id: 'west-delhi', name: 'West Delhi', region: 'delhi' },
  { id: 'central-delhi', name: 'Central Delhi', region: 'delhi' },
  { id: 'dwarka', name: 'Dwarka', region: 'delhi' },
  { id: 'rohini', name: 'Rohini', region: 'delhi' },
  { id: 'noida', name: 'Noida', region: 'noida' },
  { id: 'greater-noida', name: 'Greater Noida', region: 'noida' },
  { id: 'gurugram', name: 'Gurugram', region: 'gurugram' },
  { id: 'ghaziabad', name: 'Ghaziabad', region: 'ghaziabad' },
  { id: 'faridabad', name: 'Faridabad', region: 'faridabad' },
]

const byId = new Map(AREAS.map((a) => [a.id, a]))

export function getArea(id: string): Area | undefined {
  return byId.get(id)
}

export function areaName(id: string): string {
  return byId.get(id)?.name ?? 'Delhi NCR'
}
