import type { FaqItem } from '@shared/types'
import { FEES } from '@shared/fees'

export const FAQ_SECTIONS: Record<FaqItem['section'], string> = {
  renting: 'Renting things',
  owning: 'Listing your things',
  payments: 'Money and deposits',
  safety: 'Safety and damage',
  account: 'Your account',
}

export const FAQS: FaqItem[] = [
  {
    id: 'f1',
    section: 'renting',
    q: 'How does renting work?',
    a: 'Find something nearby, pick your dates and send a request. Once the owner accepts, you agree a pickup time in Messages, check the item together, and you’re off.',
  },
  {
    id: 'f2',
    section: 'renting',
    q: 'Can I get things delivered?',
    a: 'Many owners offer delivery for a small fee, which you’ll see on the listing. Use the “Delivery available” filter on Browse to see only those.',
  },
  {
    id: 'f3',
    section: 'renting',
    q: 'What if I need it for longer?',
    a: 'Message the owner before your return date. If the dates are free, they can extend your booking. Lots of listings have cheaper weekly and monthly rates, which kick in automatically.',
  },
  {
    id: 'f4',
    section: 'renting',
    q: 'Can I cancel a request?',
    a: 'Yes. Requests the owner hasn’t accepted yet can be cancelled any time from your dashboard. After they accept, please message them first. They may have turned down someone else for your dates.',
  },
  {
    id: 'f5',
    section: 'owning',
    q: 'What can I list?',
    a: 'Anything legal, safe and in working order that you’d be comfortable lending a neighbour: cameras, tools, party gear, baby gear, instruments and so on. We don’t allow vehicles, weapons, medicines or anything that needs a licence to use.',
  },
  {
    id: 'f6',
    section: 'owning',
    q: 'How much should I charge?',
    a: 'A good starting point is 1–3% of what the item costs new, per day. The earnings estimator on our home page shows typical rates for each category. You can always change your price later.',
  },
  {
    id: 'f7',
    section: 'owning',
    q: 'Do I have to accept every request?',
    a: 'No. You see the renter’s profile, reviews and verification before you accept. If something feels off, decline. You don’t need to give a reason.',
  },
  {
    id: 'f8',
    section: 'payments',
    q: 'What fees does RentiGoo charge?',
    a:
      FEES.serviceFeePct === 0 && FEES.ownerCommissionPct === 0
        ? 'None right now. While renters pay owners directly at pickup, RentiGoo charges no service fee and takes no commission. Listing is free. If we introduce fees when online payments start, we’ll update our Terms first and show every fee before you request.'
        : `Renters pay a ${FEES.serviceFeePct}% service fee on the rent${FEES.gstOnFeePct > 0 ? `, plus ${FEES.gstOnFeePct}% GST on that fee` : ''}. Owners pay a ${FEES.ownerCommissionPct}% commission on the rent they earn. There’s no fee to list, and the deposit is never charged a fee.`,
  },
  {
    id: 'f9',
    section: 'payments',
    q: 'How do I pay right now?',
    a: 'While we’re getting online payments ready, you pay the owner at pickup, by UPI or cash. The exact amount is shown on your booking, so there’s nothing to negotiate on the day.',
  },
  {
    id: 'f10',
    section: 'payments',
    q: 'How does the deposit work?',
    a: 'The deposit is set by the owner and shown before you request. You hand it over at pickup. Our terms require the owner to return it when the item comes back in the same condition, apart from normal wear.',
  },
  {
    id: 'f11',
    section: 'safety',
    q: 'What if something gets damaged?',
    a: 'Tell the owner straight away and take photos. Normal wear is expected. For real damage, the owner can keep part of the deposit to cover the repair, and must show you the repair bill or quote. If you can’t agree, contact our grievance officer (details on our Contact page). We acknowledge complaints within 24 hours.',
  },
  {
    id: 'f12',
    section: 'safety',
    q: 'How do you check people?',
    a: 'Everyone confirms their email address before they can rent or list. That’s the only check we do today, so read reviews, chat first, and meet somewhere public for a first rental. We’ll tell you here when we add more checks.',
  },
  {
    id: 'f13',
    section: 'safety',
    q: 'Where should I meet for pickup?',
    a: 'Somewhere public or a building lobby is best for a first rental, and in daylight if you can. Check the item together before you hand over any money.',
  },
  {
    id: 'f14',
    section: 'account',
    q: 'Which areas do you cover?',
    a: 'We’re starting in Bhopal: MP Nagar, Arera Colony, New Market, Shahpura, Kolar Road, Habibganj and the neighbourhoods around them. More cities in Madhya Pradesh once we’ve got Bhopal right.',
  },
  {
    id: 'f15',
    section: 'account',
    q: 'How do I delete my account?',
    a: 'Go to Account, then “Delete my account”. It removes your profile, listings and reviews straight away. We keep a minimal record of past bookings for as long as the law requires (see our Privacy Policy).',
  },
]
