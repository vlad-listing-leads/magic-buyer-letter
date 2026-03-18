import { withErrorHandler } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import { validateRequest } from '@/lib/api/validation'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { verifyAddress, createAddress } from '@/lib/services/lob'
import { z } from 'zod'

const agentSetupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  brokerage: z.string().default(''),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  license_number: z.string().default(''),
  website: z.string().default(''),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().default(''),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2),
  zip: z.string().min(5, 'ZIP is required'),
})

export const POST = withErrorHandler(async (request) => {
  const { data: body, error: validationError } = await validateRequest(request, agentSetupSchema)
  if (validationError) return validationError

  const user = await requireAuth()
  const admin = createAdminClient()

  // Verify address via Lob
  let lobAddressId: string | null = null
  let addressVerified = false

  try {
    const verification = await verifyAddress({
      primary_line: body.address_line1,
      secondary_line: body.address_line2 || undefined,
      city: body.city,
      state: body.state,
      zip_code: body.zip,
    })

    if (verification.deliverability === 'deliverable' || verification.deliverability === 'deliverable_unnecessary_unit') {
      const lobAddress = await createAddress({
        name: body.name,
        company: body.brokerage || undefined,
        address_line1: verification.primary_line,
        address_line2: verification.secondary_line || undefined,
        address_city: verification.city,
        address_state: verification.state,
        address_zip: verification.zip_code,
        phone: body.phone,
        email: body.email,
      })
      lobAddressId = lobAddress.id
      addressVerified = true
    }
  } catch {
    // Address verification failed — profile still saved with unverified status
  }

  const agentData = {
    user_id: user.id,
    name: body.name,
    brokerage: body.brokerage,
    phone: body.phone,
    email: body.email,
    license_number: body.license_number,
    website: body.website,
    address_line1: body.address_line1,
    address_line2: body.address_line2,
    city: body.city,
    state: body.state,
    zip: body.zip,
    lob_address_id: lobAddressId,
    address_verified: addressVerified,
  }

  const { data: agent, error } = await admin
    .from('mbl_agents')
    .upsert(agentData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return apiError('Failed to save agent profile', 500)
  }

  return apiSuccess(agent)
})
