import type { BuyerProfileData } from '@/types'

/** Map chip selections to human-readable bullet text for the letter */
export function generateBullets(
  profile: BuyerProfileData,
  priceRange?: { min?: number; max?: number }
): string[] {
  const bullets: string[] = []

  // Financing bullet
  if (profile.financing) {
    const priceStr = formatPriceRange(priceRange)
    const financingMap: Record<string, string> = {
      'pre-approved': `Pre-approved${priceStr ? ` up to ${priceStr}` : ' and ready to purchase'}`,
      'cash': `Cash buyer${priceStr ? ` up to ${priceStr}` : ' — no financing contingency'}`,
      'fha': `FHA-approved${priceStr ? ` up to ${priceStr}` : ''}`,
      'va': `VA loan eligible${priceStr ? ` up to ${priceStr}` : ''}`,
      'conventional': `Conventional financing${priceStr ? ` up to ${priceStr}` : ' in place'}`,
    }
    bullets.push(financingMap[profile.financing] ?? `${profile.financing}${priceStr ? ` up to ${priceStr}` : ''}`)
  }

  // Closing flexibility bullet
  if (profile.closing_flexibility) {
    const closingMap: Record<string, string> = {
      'flexible': 'Flexible on closing — whatever works best for you',
      'quick-close': 'Can close quickly — as fast as 21 days',
      '30-days': 'Ready to close in 30 days',
      'no-rush': 'No rush on timing — happy to work around your schedule',
      'rent-back': 'Open to a rent-back arrangement if you need more time',
    }
    bullets.push(closingMap[profile.closing_flexibility] ?? profile.closing_flexibility)
  }

  // Condition tolerance bullet
  if (profile.condition_tolerance) {
    const conditionMap: Record<string, string> = {
      'minor-updates': 'Comfortable with homes needing minor updates',
      'as-is': 'Happy to buy as-is — no repairs needed from you',
      'move-in-ready': 'Looking for move-in ready homes',
      'major-reno': 'Open to major renovations — not afraid of a project',
    }
    bullets.push(conditionMap[profile.condition_tolerance] ?? profile.condition_tolerance)
  }

  return bullets
}

function formatPriceRange(range?: { min?: number; max?: number }): string {
  if (!range) return ''
  const { min, max } = range
  if (min && max) return `$${formatK(min)}–$${formatK(max)}`
  if (max) return `$${formatK(max)}`
  if (min) return `$${formatK(min)}`
  return ''
}

function formatK(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1000) return `${Math.round(val / 1000)}K`
  return String(val)
}
