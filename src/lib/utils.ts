import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date for display */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

/** Format a date without time */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

/** Fields required for content generation (letters, emails, texts, call scripts) */
const REQUIRED_AGENT_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'brokerage', label: 'Brokerage' },
] as const

/** Returns list of missing required agent profile fields, or empty array if complete */
export function getAgentProfileGaps(
  agent: Record<string, unknown> | null | undefined
): { key: string; label: string }[] {
  if (!agent) return REQUIRED_AGENT_FIELDS.map(({ key, label }) => ({ key, label }))
  return REQUIRED_AGENT_FIELDS.filter(
    ({ key }) => !agent[key] || (typeof agent[key] === 'string' && (agent[key] as string).trim() === '')
  ).map(({ key, label }) => ({ key, label }))
}
