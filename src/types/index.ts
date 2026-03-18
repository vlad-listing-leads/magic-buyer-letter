/** User record from our database */
export interface User {
  id: string
  email: string
  name: string
  memberstack_id: string
  role: 'user' | 'admin' | 'superadmin'
  created_at: string
  updated_at: string
}

/** Listing Leads profile data (fetched from LL database) */
export interface LLProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  memberstackId: string
  role: string
  region: string
  fields: Record<string, string>
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
}

// =============================================================================
// Magic Buyer Letter Types
// =============================================================================

/** Campaign status progression */
export type CampaignStatus =
  | 'searching'
  | 'skip_tracing'
  | 'verifying'
  | 'generating'
  | 'ready'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'error'
  | 'cancelled'

/** Property status progression */
export type PropertyStatus =
  | 'found'
  | 'skip_traced'
  | 'verified'
  | 'generated'
  | 'sent'
  | 'delivered'
  | 'returned'
  | 'send_failed'
  | 'cancelled'

/** Owner type classification */
export type OwnerType = 'owner' | 'absentee' | 'investor' | 'corporate' | 'unknown'

/** Letter template style */
export type TemplateStyle = 'warm' | 'direct' | 'luxury'

/** Lob delivery status */
export type DeliveryStatus =
  | 'pending'
  | 'in_transit'
  | 'in_local_area'
  | 'processed_for_delivery'
  | 'delivered'
  | 'returned'
  | 're_routed'
  | 'cancelled'

/** Stripe payment status */
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

/** Agent profile for letter sending */
export interface MblAgent {
  id: string
  user_id: string
  name: string
  brokerage: string
  phone: string
  email: string
  license_number: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  lob_address_id: string | null
  address_verified: boolean
  headshot_url: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

/** Letter campaign with buyer criteria */
export interface MblCampaign {
  id: string
  user_id: string
  agent_id: string
  status: CampaignStatus
  buyer_name: string
  buyer_description: string
  criteria_price_min: number | null
  criteria_price_max: number | null
  criteria_beds_min: number | null
  criteria_baths_min: number | null
  criteria_sqft_min: number | null
  criteria_sqft_max: number | null
  criteria_area: string
  criteria_city: string
  criteria_state: string
  criteria_zip: string
  template_style: TemplateStyle
  bullet_1: string
  bullet_2: string
  bullet_3: string
  bullet_4: string | null
  total_properties: number
  properties_skip_traced: number
  properties_verified: number
  properties_generated: number
  properties_sent: number
  properties_delivered: number
  properties_returned: number
  stripe_session_id: string | null
  stripe_payment_status: PaymentStatus
  total_cost_cents: number
  price_per_letter_cents: number
  error_message: string | null
  created_at: string
  updated_at: string
}

/** Individual property within a campaign */
export interface MblProperty {
  id: string
  campaign_id: string
  status: PropertyStatus
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  county: string
  neighborhood: string
  latitude: number | null
  longitude: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lot_sqft: number | null
  year_built: number | null
  estimated_value: number | null
  last_sale_price: number | null
  last_sale_date: string | null
  equity_percent: number | null
  years_owned: number | null
  property_type: string
  owner_first_name: string | null
  owner_last_name: string | null
  owner_type: OwnerType
  owner_mailing_address: string | null
  owner_phone: string | null
  owner_email: string | null
  address_verified: boolean
  address_deliverable: boolean | null
  lob_verification_id: string | null
  personalized_content: PersonalizedContent | null
  lob_letter_id: string | null
  lob_url: string | null
  expected_delivery: string | null
  delivery_status: DeliveryStatus
  delivery_events: DeliveryEvent[]
  selected: boolean
  created_at: string
  updated_at: string
}

/** Claude-generated personalized letter content */
export interface PersonalizedContent {
  opening: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  closing: string
}

/** Lob delivery tracking event */
export interface DeliveryEvent {
  type: string
  date: string
  location: string | null
}

// =============================================================================
// Pipeline SSE Events
// =============================================================================

export type PipelineStep = 'searching' | 'skip_tracing' | 'verifying' | 'generating' | 'ready' | 'error'

export interface PipelineEvent {
  step: PipelineStep
  progress: number
  message: string
  count?: number
  campaignId?: string
  error?: string
}

// =============================================================================
// External API Types
// =============================================================================

/** RealEstateAPI property search criteria */
export interface PropertySearchCriteria {
  price_min?: number
  price_max?: number
  beds_min?: number
  baths_min?: number
  sqft_min?: number
  sqft_max?: number
  area?: string
  city?: string
  state?: string
  zip?: string
}

/** Lob address verification result */
export interface LobVerificationResult {
  id: string
  deliverability: 'deliverable' | 'deliverable_unnecessary_unit' | 'deliverable_incorrect_unit' | 'deliverable_missing_unit' | 'undeliverable'
  primary_line: string
  secondary_line: string
  city: string
  state: string
  zip_code: string
}

/** Lob letter creation result */
export interface LobLetterResult {
  id: string
  url: string
  expected_delivery_date: string
  send_date: string
}

/** Agent setup form data */
export interface AgentSetupData {
  name: string
  brokerage: string
  phone: string
  email: string
  license_number: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
}

/** Campaign creation data */
export interface CampaignCreateData {
  buyer_name: string
  buyer_description: string
  criteria: PropertySearchCriteria
  template_style: TemplateStyle
  bullet_1: string
  bullet_2: string
  bullet_3: string
  bullet_4?: string
}
