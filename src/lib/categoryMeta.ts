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

/** Warm, muted tones per category (defined in src/index.css as --tone-<category>), mixed with the surface so both themes work. */
export const CATEGORY_TONES: Record<string, string> = Object.fromEntries(
  ['cameras', 'electronics', 'party', 'tools', 'outdoor', 'furniture', 'appliances', 'music', 'baby', 'fitness'].map((id) => [id, `var(--tone-${id})`]),
)

export function categoryIcon(id: string): LucideIcon {
  return ICONS[id] ?? Package
}
