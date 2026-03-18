import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { LobVerificationResult, LobLetterResult } from '@/types'

const LOB_BASE_URL = 'https://api.lob.com/v1'

function getAuthHeader(): string {
  return `Basic ${Buffer.from(env.lob.apiKey + ':').toString('base64')}`
}

async function lobFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${LOB_BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error({ status: res.status, body: errorBody, path }, 'Lob API error')
    throw new Error(`Lob API error ${res.status}: ${errorBody}`)
  }

  return res.json() as Promise<T>
}

export async function verifyAddress(address: {
  primary_line: string
  secondary_line?: string
  city: string
  state: string
  zip_code: string
}): Promise<LobVerificationResult> {
  return lobFetch<LobVerificationResult>('/us_verifications', {
    method: 'POST',
    body: JSON.stringify(address),
  })
}

export async function createAddress(data: {
  name: string
  company?: string
  address_line1: string
  address_line2?: string
  address_city: string
  address_state: string
  address_zip: string
  phone?: string
  email?: string
}): Promise<{ id: string }> {
  return lobFetch<{ id: string }>('/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createLetter(data: {
  to: {
    name: string
    address_line1: string
    address_line2?: string
    address_city: string
    address_state: string
    address_zip: string
  }
  from: string // Lob address ID
  template_id: string
  merge_variables: Record<string, string>
  metadata?: Record<string, string>
}): Promise<LobLetterResult> {
  const payload = {
    ...data,
    color: true,
    double_sided: false,
    address_placement: 'top_first_page',
    mail_type: 'usps_first_class',
  }

  return lobFetch<LobLetterResult>('/letters', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelLetter(letterId: string): Promise<{ id: string; deleted: boolean }> {
  return lobFetch<{ id: string; deleted: boolean }>(`/letters/${letterId}`, {
    method: 'DELETE',
  })
}

export async function createTemplate(
  html: string,
  description: string
): Promise<{ id: string }> {
  return lobFetch<{ id: string }>('/templates', {
    method: 'POST',
    body: JSON.stringify({
      description,
      html,
    }),
  })
}
