import { NextRequest, NextResponse } from 'next/server'
import { apiError } from './response'
import { requireAuth } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api-middleware')

type RouteContext = { params: Promise<Record<string, string>> }
type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse>

/**
 * Wraps a route handler with error handling.
 * Catches unhandled errors and returns a clean 500 response.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return apiError('Unauthorized', 401)
      }
      log.error({ error, url: request.url }, 'Unhandled API error')
      return apiError('Internal server error', 500)
    }
  }
}

/**
 * Wraps a route handler with admin role check.
 * Returns 403 if user is not admin or superadmin.
 */
export function withAdminGuard(handler: RouteHandler): RouteHandler {
  return withErrorHandler(async (request, context) => {
    const user = await requireAuth()
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return apiError('Forbidden', 403)
    }

    return handler(request, context)
  })
}
