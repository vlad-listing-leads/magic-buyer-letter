import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/middleware'
import { apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'

export const GET = withErrorHandler(async (_request: NextRequest, context) => {
  const user = await requireAuth()
  const admin = createAdminClient()
  const { id } = await context.params

  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('id, buyer_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return apiError('Campaign not found', 404)

  const { data: properties } = await admin
    .from('mbl_properties')
    .select('*')
    .eq('campaign_id', id)
    .eq('selected', true)
    .order('created_at', { ascending: true })

  if (!properties || properties.length === 0) {
    return apiError('No properties to export', 400)
  }

  // Build CSV
  const headers = [
    'Owner Name',
    'Address',
    'City',
    'State',
    'ZIP',
    'Beds',
    'Baths',
    'Sqft',
    'Est. Value',
    'Year Built',
    'Years Owned',
    'Owner Type',
    'Neighborhood',
  ]

  const rows = properties.map((p) => [
    `${p.owner_first_name ?? ''} ${p.owner_last_name ?? ''}`.trim(),
    p.address_line1,
    p.city,
    p.state,
    p.zip,
    p.bedrooms ?? '',
    p.bathrooms ?? '',
    p.sqft ?? '',
    p.estimated_value ?? '',
    p.year_built ?? '',
    p.years_owned ?? '',
    p.owner_type,
    p.neighborhood ?? '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        const str = String(cell)
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ].join('\n')

  const filename = `${campaign.buyer_name.replace(/[^a-zA-Z0-9]/g, '_')}_addresses.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
