import {
  AirVent,
  Armchair,
  Baby,
  Camera,
  Dumbbell,
  Gamepad2,
  Guitar,
  Hammer,
  Package,
  PartyPopper,
  Tent,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  cameras: Camera,
  electronics: Gamepad2,
  party: PartyPopper,
  tools: Hammer,
  outdoor: Tent,
  furniture: Armchair,
  appliances: AirVent,
  music: Guitar,
  baby: Baby,
  fitness: Dumbbell,
}

/** Warm, muted tones per category, mixed with the surface so both themes work. */
export const CATEGORY_TONES: Record<string, string> = {
  cameras: '#c9a76a',
  electronics: '#8fa3b8',
  party: '#d9a0a0',
  tools: '#b8a07a',
  outdoor: '#8fae8a',
  furniture: '#c2a58f',
  appliances: '#9fb4b0',
  music: '#b79ab8',
  baby: '#e0b894',
  fitness: '#a8b08a',
}

export function categoryIcon(id: string): LucideIcon {
  return ICONS[id] ?? Package
}
