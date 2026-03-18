import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { TemplateStyle, PersonalizedContent } from '@/types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_CONCURRENT = 10

interface OwnerContext {
  owner_first_name: string
  owner_last_name: string
  owner_type: string
  address: string
  neighborhood: string
  estimated_value: number | null
  years_owned: number | null
  bedrooms: number | null
  sqft: number | null
}

interface BuyerContext {
  buyer_name: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  template_style: TemplateStyle
}

function buildSystemPrompt(ownerType: string, templateStyle: TemplateStyle): string {
  const toneMap: Record<TemplateStyle, string> = {
    warm: 'Write in a warm, personal, conversational tone. Be genuine and relatable.',
    direct: 'Write in a professional, direct, and concise tone. Focus on the business opportunity.',
    luxury: 'Write in a refined, sophisticated tone. Use elevated language appropriate for high-value properties.',
  }

  const ownerAngle: Record<string, string> = {
    absentee: 'The owner lives elsewhere. Emphasize the convenience of selling without hassle — no showings, no repairs needed.',
    investor: 'This is an investor-owned property. Focus on ROI, market timing, and a clean transaction.',
    owner: 'The owner lives in the home. Show deep respect for their home and the memories there.',
    corporate: 'This is a corporate-owned property. Focus on a smooth, professional transaction.',
    unknown: 'Write a general appeal that would work for any homeowner.',
  }

  return `You are a real estate letter writer. ${toneMap[templateStyle]}

${ownerAngle[ownerType] ?? ownerAngle.unknown}

Respond with ONLY a JSON object (no markdown, no explanation) with these keys:
- "opening": A personalized opening sentence (1-2 sentences) mentioning the property address and neighborhood
- "bullet_1": A customized version of the buyer's first selling point, personalized to this specific owner
- "bullet_2": A customized version of the buyer's second selling point
- "bullet_3": A customized version of the buyer's third selling point
- "closing": A warm closing sentence (1 sentence)

Keep each bullet under 25 words. Make the opening feel personal, not templated.`
}

function buildUserPrompt(owner: OwnerContext, buyer: BuyerContext): string {
  return `Owner: ${owner.owner_first_name} ${owner.owner_last_name}
Property: ${owner.address}, ${owner.neighborhood}
Est. Value: ${owner.estimated_value ? `$${owner.estimated_value.toLocaleString()}` : 'Unknown'}
Years Owned: ${owner.years_owned ?? 'Unknown'}
Beds: ${owner.bedrooms ?? '?'}, Sqft: ${owner.sqft ?? '?'}
Owner Type: ${owner.owner_type}

Buyer: ${buyer.buyer_name}
Buyer Bullet 1: ${buyer.bullet_1}
Buyer Bullet 2: ${buyer.bullet_2}
Buyer Bullet 3: ${buyer.bullet_3}`
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<PersonalizedContent> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error({ status: res.status, body: errorBody }, 'Claude API error')
    throw new Error(`Claude API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    return JSON.parse(text) as PersonalizedContent
  } catch {
    logger.warn({ text }, 'Failed to parse Claude response as JSON')
    return {
      opening: text.slice(0, 200),
      bullet_1: '',
      bullet_2: '',
      bullet_3: '',
      closing: '',
    }
  }
}

export async function generateLetterContent(
  owner: OwnerContext,
  buyer: BuyerContext
): Promise<PersonalizedContent> {
  const systemPrompt = buildSystemPrompt(owner.owner_type, buyer.template_style)
  const userPrompt = buildUserPrompt(owner, buyer)
  return callClaude(systemPrompt, userPrompt)
}

export async function generateBatch(
  owners: OwnerContext[],
  buyer: BuyerContext,
  onProgress?: (completed: number) => void
): Promise<Map<string, PersonalizedContent>> {
  const results = new Map<string, PersonalizedContent>()
  let completed = 0

  // Process in concurrent batches
  for (let i = 0; i < owners.length; i += MAX_CONCURRENT) {
    const batch = owners.slice(i, i + MAX_CONCURRENT)
    const batchResults = await Promise.allSettled(
      batch.map(owner => generateLetterContent(owner, buyer))
    )

    batchResults.forEach((result, idx) => {
      const ownerKey = `${batch[idx].owner_first_name}_${batch[idx].owner_last_name}_${batch[idx].address}`
      if (result.status === 'fulfilled') {
        results.set(ownerKey, result.value)
      }
      completed++
      onProgress?.(completed)
    })
  }

  return results
}
