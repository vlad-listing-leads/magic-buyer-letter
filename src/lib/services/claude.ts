import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { TemplateStyle } from '@/types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

/** The template Claude generates — uses {{variables}} that the app fills in */
export interface LetterTemplate {
  opening: string
  body: string
  closing: string
}

interface CampaignContext {
  buyer_name: string
  area: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  template_style: TemplateStyle
}

function buildSystemPrompt(templateStyle: TemplateStyle): string {
  const toneMap: Record<TemplateStyle, string> = {
    warm: 'Write in a warm, personal, conversational tone. Be genuine and relatable.',
    direct: 'Write in a professional, direct, and concise tone. Focus on the business opportunity.',
    luxury: 'Write in a refined, sophisticated tone. Use elevated language appropriate for high-value properties.',
  }

  return `You are a real estate letter writer. ${toneMap[templateStyle]}

Write a buyer letter template. Use these EXACT variables (double curly braces) — the app will replace them with real data for each recipient:

Available variables:
- {{property_address}} — their property street address + city
- {{neighborhood}} — their neighborhood name
- {{buyer_name}} — the buyer's name (already provided)
- {{bullet_1}}, {{bullet_2}}, {{bullet_3}} — buyer selling points (already provided)
- {{agent_name}} — the agent's name
- {{agent_phone}} — agent's phone number

Do NOT use owner names — we don't have them. Address the homeowner generically.

Respond with ONLY a JSON object (no markdown, no explanation) with these keys:
- "opening": 2-3 sentences. Mention {{property_address}} and {{neighborhood}}. Address the homeowner without using their name.
- "body": 2-3 sentences in the middle of the letter, between the opening and the bullet points. Explain why the agent is writing and what makes the buyer special.
- "closing": 1-2 sentences after the bullets. Include a call-to-action mentioning {{agent_phone}}.

Do NOT include the bullet points in your response — the app adds those separately.
Do NOT include greetings like "Dear" — the app handles that.
Keep it concise — total letter should be under 300 words.`
}

function buildUserPrompt(context: CampaignContext): string {
  return `Buyer: ${context.buyer_name}
Area: ${context.area}
Bullet 1: ${context.bullet_1}
Bullet 2: ${context.bullet_2}
Bullet 3: ${context.bullet_3}

Write the letter template with {{variables}} for personalization.`
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<LetterTemplate> {
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
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0]) as LetterTemplate
  } catch {
    logger.warn({ text }, 'Failed to parse Claude response as JSON')
    return {
      opening: 'Your home at {{property_address}} caught my eye. My clients, {{buyer_name}}, are specifically looking for a home in {{neighborhood}}.',
      body: "We've been searching for the right property for a while now. Nothing on the market has been the right fit — that's why I'm reaching out directly.",
      closing: "If you'd be open to a conversation, I'd love to tell you more. You can reach me at {{agent_phone}}. I look forward to hearing from you.",
    }
  }
}

/**
 * Generate ONE letter template for the entire campaign.
 * Returns a template with {{variables}} that the app fills in per-property.
 */
export async function generateLetterTemplate(
  context: CampaignContext
): Promise<LetterTemplate> {
  const systemPrompt = buildSystemPrompt(context.template_style)
  const userPrompt = buildUserPrompt(context)
  return callClaude(systemPrompt, userPrompt)
}

/**
 * Fill in a letter template with actual property/agent data.
 */
export function fillTemplate(
  template: LetterTemplate,
  vars: Record<string, string>
): LetterTemplate {
  const fill = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
  }
  return {
    opening: fill(template.opening),
    body: fill(template.body),
    closing: fill(template.closing),
  }
}
