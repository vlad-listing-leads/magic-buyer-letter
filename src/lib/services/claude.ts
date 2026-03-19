import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

/** The template Claude generates — uses {{variables}} that the app fills in */
export interface LetterTemplate {
  opening: string
  body: string
  closing: string
  ps?: string
}

interface CampaignContext {
  buyer_name: string
  area: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
}

/**
 * System prompt — ONLY explains variables and JSON format.
 * All creative direction comes from the skill's prompt_instructions.
 */
function buildSystemPrompt(skillInstructions: string): string {
  return `You write real estate buyer letters. Follow these instructions for tone, style, and format:

${skillInstructions}

VARIABLES — use these exact placeholders (double curly braces). The app replaces them per recipient:
- {{property_address}} — recipient's street address + city
- {{neighborhood}} — their neighborhood name
- {{buyer_name}} — the buyer's name
- {{bullet_1}}, {{bullet_2}}, {{bullet_3}} — buyer selling points
- {{agent_name}} — the sending agent's name
- {{agent_phone}} — agent's phone number

We do NOT have homeowner names. Address them generically.

RESPONSE FORMAT — respond with ONLY a JSON object, no markdown:
{
  "opening": "the opening section of the letter",
  "body": "the middle section, before bullet points",
  "closing": "the closing section, after bullet points",
  "ps": "optional postscript, or empty string if not needed"
}

The app will insert bullet points between "body" and "closing" automatically.
The app will add the agent signature block automatically.`
}

function buildUserPrompt(context: CampaignContext): string {
  return `Write a letter for this buyer:

Buyer: ${context.buyer_name}
Area: ${context.area}
Bullet 1: ${context.bullet_1}
Bullet 2: ${context.bullet_2}
Bullet 3: ${context.bullet_3}`
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
    logger.warn({ text }, 'Failed to parse Claude response as JSON, using raw text')
    return {
      opening: text.slice(0, Math.floor(text.length * 0.4)),
      body: text.slice(Math.floor(text.length * 0.4), Math.floor(text.length * 0.7)),
      closing: text.slice(Math.floor(text.length * 0.7)),
    }
  }
}

/**
 * Generate a letter template using a skill's prompt instructions.
 * The skill controls ALL creative direction — tone, format, length, style.
 */
export async function generateLetterForSkill(
  context: CampaignContext,
  skillInstructions: string
): Promise<LetterTemplate> {
  logger.info({ skillInstructions: skillInstructions.slice(0, 100), buyer: context.buyer_name }, 'Generating letter for skill')
  const systemPrompt = buildSystemPrompt(skillInstructions)
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
    ps: template.ps ? fill(template.ps) : undefined,
  }
}
