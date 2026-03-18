import type { TemplateStyle } from '@/types'

export interface LetterTemplate {
  id: TemplateStyle
  name: string
  description: string
  tone: string
}

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'warm',
    name: 'Warm & Personal',
    description: 'Friendly, heartfelt tone that builds an emotional connection',
    tone: 'conversational, warm, genuine',
  },
  {
    id: 'direct',
    name: 'Straight to the Point',
    description: 'Professional, concise, and focused on the opportunity',
    tone: 'professional, direct, confident',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Refined language for high-value properties and discerning owners',
    tone: 'sophisticated, refined, exclusive',
  },
]

export function getTemplate(style: TemplateStyle): LetterTemplate {
  return LETTER_TEMPLATES.find(t => t.id === style) ?? LETTER_TEMPLATES[0]
}

export function buildMergeVariables(data: {
  property_address: string
  neighborhood: string
  buyer_name: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  agent_name: string
  agent_brokerage: string
  agent_phone: string
  agent_website: string
  agent_headshot_url: string
  agent_logo_url: string
  agent_initials: string
  agent_address_line1: string
  agent_city: string
  agent_state: string
  agent_zip: string
}): Record<string, string> {
  return { ...data }
}
