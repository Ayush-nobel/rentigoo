import type { Review } from '@shared/types'
import { DEMO_USER_ID } from './users'

type R = [listingId: string, authorId: string, rating: Review['rating'], text: string, daysAgo: number]

// Renter reviews of listings (and so of their owners).
const rows: R[] = [
  ['l-sony-a7iii', 'u-simran', 5, 'Priya explained every setting before I left and the camera was spotless. My cousin’s sangeet photos came out beautifully.', 12],
  ['l-sony-a7iii', 'u-rohan', 5, 'Exactly as described, two full batteries and a clean sensor. Pickup in MP Nagar took five minutes.', 34],
  ['l-sony-a7iii', 'u-kabir', 4, 'Great camera. The bag is a bit tight with a second lens, but no complaints otherwise.', 61],
  ['l-canon-50mm', 'u-aisha', 5, 'Tack sharp and saved me from buying one for a single shoot.', 20],
  ['l-gopro-12', 'u-vikram', 5, 'Took it to Pachmarhi and got lovely Bee Falls footage. Mounts were all there and Aisha sent me a quick settings guide on WhatsApp.', 9],
  ['l-gopro-12', DEMO_USER_ID, 4, 'Worked perfectly for kayaking on the Upper Lake. Battery life is the usual GoPro story, so the spare helped.', 45],
  ['l-dji-mini', 'u-arjun', 5, 'Aisha double-checked I knew the no-fly zones before handing it over. Footage of our farmhouse event was gorgeous.', 7],
  ['l-ps5', 'u-rohan', 5, 'Kids were thrilled for Diwali week. Controllers fully charged, games all worked.', 14],
  ['l-ps5', 'u-neha', 5, 'Smooth handover and fair deposit. We’ll rent again during the winter break.', 50],
  ['l-projector', 'u-simran', 4, 'Bright enough once we drew the curtains. The Fire TV stick was a nice touch.', 27],
  ['l-jbl-partybox', 'u-priya', 5, 'Our terrace party was loud in the best way. Arjun even delivered it and helped set up.', 6],
  ['l-jbl-partybox', 'u-aisha', 5, 'Battery lasted the whole night, mic was perfect for the toasts.', 40],
  ['l-jbl-partybox', 'u-kabir', 4, 'Sounded great. Delivery came 20 minutes late but Arjun messaged ahead.', 72],
  ['l-fairy-lights', 'u-neha', 5, 'Turned our living room into a mehendi venue for a fraction of what the decorator quoted.', 16],
  ['l-folding-chairs', 'u-simran', 5, 'Delivered on time and picked up the next morning. Saved us so much hassle.', 4],
  ['l-bosch-drill', 'u-ananya', 5, 'Rohan showed me which bit to use for the concrete wall. Curtain rods are finally up!', 30],
  ['l-bosch-drill', 'u-aisha', 5, 'Powerful, well looked after, and the safety glasses were a thoughtful touch.', 66],
  ['l-ladder', 'u-neha', 4, 'Sturdy and easy to carry. Did fans in every room in one afternoon.', 38],
  ['l-pressure-washer', 'u-arjun', 5, 'My balcony hasn’t looked this good since we moved in.', 11],
  ['l-tent-4p', 'u-aisha', 5, 'Rained all night at Kathotia and we stayed bone dry. Vikram packed it neatly too.', 25],
  ['l-tent-4p', DEMO_USER_ID, 4, 'Good tent, easy setup. One peg was bent but Vikram had spares.', 70],
  ['l-rucksack', 'u-simran', 4, 'Comfortable for a three-day trek. Hip belt really helps.', 33],
  ['l-sleeping-bags', 'u-vikram', 5, 'Warm and clean. Ananya even included a spare liner.', 19],
  ['l-sleeping-bags', 'u-rohan', 5, 'Perfect for our December camping trip at Halali Dam. Packed tiny.', 48],
  ['l-air-purifier', 'u-ananya', 5, 'Diwali smoke in our lane is no joke. This cleared the bedroom air overnight, so I’m keeping it for the rest of November.', 3],
  ['l-air-purifier', 'u-priya', 4, 'Does what it says. A little loud on turbo mode.', 29],
  ['l-stroller', 'u-aisha', 5, 'Used it for a Goa trip with my sister’s baby. Folded easily at the airport.', 22],
  ['l-car-seat', 'u-kabir', 5, 'Clean, easy to fit, and Neha showed us the ISOFIX clips.', 41],
  ['l-yamaha-keyboard', 'u-neha', 5, 'My daughter played at her school annual day. Simran tuned the voices for us.', 17],
  ['l-acoustic-guitar', 'u-arjun', 4, 'Nice tone and easy to play. Good way to find out if I’d actually practise.', 52],
  ['l-treadmill', 'u-simran', 4, 'Delivered and set up properly. Helped me decide I do want to buy one.', 10],
]

export const REVIEWS: Review[] = rows.map(([listingId, authorId, rating, text, daysAgo], i) => ({
  id: `r-${i + 1}`,
  listingId,
  bookingId: `b-past-${i + 1}`,
  authorId: authorId === 'u-ananya' ? DEMO_USER_ID : authorId,
  targetUserId: '', // filled in by the data index from the listing owner
  rating,
  text,
  role: 'renter',
  createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
}))
