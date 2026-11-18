import { LAUNCH_CITY } from '@shared/areas'
import type { PageMeta } from './seo'

/**
 * How people search for each category ("camera on rent bhopal"), for the
 * /rent/<category> landing pages: heading, page title and a one-line intro.
 */
export const CATEGORY_PAGES: Record<string, { heading: string; intro: string }> = {
  cameras: { heading: `Camera on rent in ${LAUNCH_CITY}`, intro: 'DSLRs, mirrorless cameras, lenses and GoPros, rented by the day from people nearby.' },
  electronics: { heading: `Projector, PS5 and speakers on rent in ${LAUNCH_CITY}`, intro: 'Consoles, projectors and speakers for a match night, a movie night or a weekend.' },
  party: { heading: `Party speakers and lights on rent in ${LAUNCH_CITY}`, intro: 'Party speakers, lights, decor and tents for birthdays, weddings and get-togethers.' },
  tools: { heading: `Tools on rent in ${LAUNCH_CITY}`, intro: 'Drills, ladders and pressure washers for a job that takes a day, not a lifetime.' },
  outdoor: { heading: `Camping gear on rent in ${LAUNCH_CITY}`, intro: 'Tents, sleeping bags, rucksacks and trekking gear for Pachmarhi or a weekend away.' },
  furniture: { heading: `Furniture on rent in ${LAUNCH_CITY}`, intro: 'Desks, chairs, sofas and extra seating, by the day or by the month.' },
  appliances: { heading: `Appliances on rent in ${LAUNCH_CITY}`, intro: 'Coolers, heaters, purifiers and more, for a season or a few months.' },
  music: { heading: `Musical instruments on rent in ${LAUNCH_CITY}`, intro: 'Guitars, keyboards and cajóns to practise on, or for one performance.' },
  baby: { heading: `Baby gear on rent in ${LAUNCH_CITY}`, intro: 'Strollers, car seats and cribs for a visit, a trip or the months you need them.' },
  fitness: { heading: `Gym equipment on rent in ${LAUNCH_CITY}`, intro: 'Treadmills, cycles and weights for home workouts, by the month.' },
}

export const categoryPagePath = (id: string) => `/rent/${id}`
export const categoryDataKey = (id: string) => `category:${id}`

/** Title, description and address of a category page, for <Seo> and the prerendered <head>. */
export function categoryPageMeta(id: string): PageMeta {
  const p = CATEGORY_PAGES[id]!
  return { title: p.heading, description: `${p.intro} Rent in ${LAUNCH_CITY} from someone near you, with prices and deposits upfront.`, path: categoryPagePath(id) }
}
