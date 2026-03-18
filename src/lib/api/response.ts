import { NextResponse } from 'next/server'

/**
 * Standard API response envelope.
 * All satellite apps use this format for consistency.
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
}

/** Return a successful API response */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, error: null },
    { status }
  )
}

/** Return an error API response */
export function apiError(message: string, status = 400) {
  return NextResponse.json<ApiResponse>(
    { success: false, data: null, error: message },
    { status }
  )
}
