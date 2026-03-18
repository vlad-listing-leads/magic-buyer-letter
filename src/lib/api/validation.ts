import { NextRequest } from 'next/server'
import { z, ZodSchema } from 'zod'
import { apiError } from './response'

/**
 * Validate a request body against a Zod schema.
 * Returns parsed data on success, or a NextResponse error on failure.
 */
export async function validateRequest<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: ReturnType<typeof apiError> }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      return { error: apiError(message, 400) }
    }

    return { data: result.data }
  } catch {
    return { error: apiError('Invalid JSON body', 400) }
  }
}
