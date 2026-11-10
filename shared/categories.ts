import type { Category } from './types'

/** Typical prices are rough Bhopal figures used to prefill the calculators. */
export const CATEGORIES: Category[] = [
  {
    id: 'cameras',
    name: 'Cameras',
    blurb: 'DSLRs, mirrorless, lenses, GoPros',
    avgDailyRate: 750,
    avgPurchasePrice: 85000,
    typicalResalePct: 55,
    typicalUpkeepPerYear: 2500,
  },
  {
    id: 'electronics',
    name: 'Electronics & gaming',
    blurb: 'Consoles, projectors, speakers',
    avgDailyRate: 500,
    avgPurchasePrice: 45000,
    typicalResalePct: 45,
    typicalUpkeepPerYear: 1500,
  },
  {
    id: 'party',
    name: 'Party & events',
    blurb: 'Lights, sound, decor, tents',
    avgDailyRate: 600,
    avgPurchasePrice: 25000,
    typicalResalePct: 35,
    typicalUpkeepPerYear: 1500,
  },
  {
    id: 'tools',
    name: 'Tools & DIY',
    blurb: 'Drills, ladders, pressure washers',
    avgDailyRate: 200,
    avgPurchasePrice: 8000,
    typicalResalePct: 40,
    typicalUpkeepPerYear: 600,
  },
  {
    id: 'outdoor',
    name: 'Camping & outdoor',
    blurb: 'Tents, rucksacks, trekking gear',
    avgDailyRate: 280,
    avgPurchasePrice: 15000,
    typicalResalePct: 40,
    typicalUpkeepPerYear: 800,
  },
  {
    id: 'furniture',
    name: 'Furniture',
    blurb: 'Desks, chairs, extra seating',
    avgDailyRate: 150,
    avgPurchasePrice: 18000,
    typicalResalePct: 35,
    typicalUpkeepPerYear: 500,
  },
  {
    id: 'appliances',
    name: 'Appliances',
    blurb: 'ACs, coolers, heaters, purifiers',
    avgDailyRate: 300,
    avgPurchasePrice: 30000,
    typicalResalePct: 40,
    typicalUpkeepPerYear: 2500,
  },
  {
    id: 'music',
    name: 'Music instruments',
    blurb: 'Guitars, keyboards, cajóns',
    avgDailyRate: 350,
    avgPurchasePrice: 28000,
    typicalResalePct: 60,
    typicalUpkeepPerYear: 1200,
  },
  {
    id: 'baby',
    name: 'Baby & kids',
    blurb: 'Strollers, car seats, cribs',
    avgDailyRate: 200,
    avgPurchasePrice: 14000,
    typicalResalePct: 35,
    typicalUpkeepPerYear: 400,
  },
  {
    id: 'fitness',
    name: 'Fitness',
    blurb: 'Treadmills, cycles, weights',
    avgDailyRate: 280,
    avgPurchasePrice: 35000,
    typicalResalePct: 40,
    typicalUpkeepPerYear: 1500,
  },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: string): Category | undefined {
  return byId.get(id)
}

export function categoryName(id: string): string {
  return byId.get(id)?.name ?? 'Other'
}
