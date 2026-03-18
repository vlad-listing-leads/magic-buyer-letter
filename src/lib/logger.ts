import pino from 'pino'

/** PII patterns to redact from logs */
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]'],
  [/\b\d{10,11}\b/g, '[PHONE]'],
  [/\b\d{5}(-\d{4})?\b/g, '[ZIP]'],
]

const REDACTED_KEYS = new Set([
  'email', 'phone', 'first_name', 'last_name', 'name',
  'address', 'password', 'token', 'secret',
])

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let redacted = value
    for (const [pattern, replacement] of PII_PATTERNS) {
      redacted = redacted.replace(pattern, replacement)
    }
    return redacted
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = REDACTED_KEYS.has(key) ? '[REDACTED]' : redactValue(val)
    }
    return result
  }
  return value
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  formatters: {
    log(obj) {
      return redactValue(obj) as Record<string, unknown>
    },
  },
})

export function createLogger(context: string) {
  return logger.child({ context })
}
