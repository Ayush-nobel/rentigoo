/**
 * Photos on the Home page. They set the scene only: they are never shown as
 * listings or as things someone in Bhopal is renting out. All are free under
 * the Unsplash License (https://unsplash.com/license) and served from
 * /public/images/home, so no third party is contacted.
 */
export interface HomePhoto {
  alt: string
  by: string
  source: string
}

export const HERO_PHOTO: HomePhoto = {
  alt: 'A yellow tent pitched below snowy mountains at Triund',
  by: 'Harsh Fuloria',
  source: 'https://unsplash.com/photos/ywro9-JX_n0',
}

export const CATEGORY_PHOTOS: Record<string, HomePhoto> = {
  cameras: { alt: 'A DSLR camera on a wooden table', by: 'Juls P', source: 'https://unsplash.com/photos/gDqxISWQyAM' },
  electronics: { alt: 'A games console and controller on a shelf', by: 'User_Pascal', source: 'https://unsplash.com/photos/vUD9yOFjmwM' },
  party: { alt: 'Gold number balloons at a birthday party', by: 'Kortnee Greenfield', source: 'https://unsplash.com/photos/d9ystsaiOW8' },
  tools: { alt: 'Someone drilling into a wooden plank', by: 'Simone Impei', source: 'https://unsplash.com/photos/eZaKj3xAzTE' },
  outdoor: { alt: 'Tents at a mountain campsite', by: 'Harsh Fuloria', source: 'https://unsplash.com/photos/ywro9-JX_n0' },
  furniture: { alt: 'A blue sofa by a sunny window full of plants', by: 'Clay Banks', source: 'https://unsplash.com/photos/2ub1pest3T0' },
  appliances: { alt: 'A humidifier on a table by the window', by: 'DP Singh Bhullar', source: 'https://unsplash.com/photos/lXFuL37cMI8' },
  music: { alt: 'An acoustic guitar resting on a sofa', by: 'Alexey Demidov', source: 'https://unsplash.com/photos/COkHUK_-Byw' },
  baby: { alt: 'A baby in a pram', by: 'Annie Spratt', source: 'https://unsplash.com/photos/hXcoBfWUDyQ' },
  fitness: { alt: 'A pair of dumbbells on an exercise mat', by: 'Giorgio Trovato', source: 'https://unsplash.com/photos/6rlMgGzdGwM' },
}

/** Everyone whose photo appears on the Home page, once each, for the credit line. */
export const PHOTOGRAPHERS = [...new Set([HERO_PHOTO, ...Object.values(CATEGORY_PHOTOS)].map((p) => p.by))]
