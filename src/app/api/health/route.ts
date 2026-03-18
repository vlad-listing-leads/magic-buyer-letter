import { apiSuccess } from '@/lib/api/response'

/** GET /api/health — Health check endpoint */
export async function GET() {
  return apiSuccess({ status: 'ok', timestamp: new Date().toISOString() })
}
