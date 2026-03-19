import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export interface LetterTemplate {
  body: string
  ps?: string
}

interface CampaignContext {
  buyer_name: string
  area: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
}

function buildSystemPrompt(skillInstructions: string): string {
  return `${skillInstructions}

Available placeholders (app replaces per recipient): {{property_address}}, {{neighborhood}}, {{buyer_name}}, {{agent_name}}, {{agent_phone}}, {{bullet_1}}, {{bullet_2}}, {{bullet_3}}

No homeowner names available.

JSON only: {"body": "content with \\n for breaks", "ps": "or empty string"}`
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
      max_tokens: 1000,
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
    return { body: text }
  }
}

export async function generateLetterForSkill(
  context: CampaignContext,
  skillInstructions: string
): Promise<LetterTemplate> {
  logger.info({ skill: skillInstructions.slice(0, 80) }, 'Generating letter')
  const systemPrompt = buildSystemPrompt(skillInstructions)
  // User prompt: just the data, no instructions
  const userPrompt = `${context.buyer_name}, ${context.area}, {{bullet_1}}=${context.bullet_1}, {{bullet_2}}=${context.bullet_2}, {{bullet_3}}=${context.bullet_3}`
  return callClaude(systemPrompt, userPrompt)
}

export function fillTemplate(
  template: LetterTemplate,
  vars: Record<string, string>
): LetterTemplate {
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
  return {
    body: fill(template.body),
    ps: template.ps ? fill(template.ps) : undefined,
  }
}
