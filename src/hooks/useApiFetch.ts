'use client'

import { useCallback } from 'react'

/**
 * Hook for making authenticated API calls.
 * Returns a fetch wrapper that includes credentials and Content-Type headers.
 */
export function useApiFetch() {
  const apiFetch = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    return fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }, [])

  return apiFetch
}
