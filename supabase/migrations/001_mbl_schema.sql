-- =============================================================================
-- Magic Buyer Letter — Core Schema
-- =============================================================================
-- Tables: mbl_agents, mbl_campaigns, mbl_properties

-- =============================================================================
-- mbl_agents — Agent profiles with Lob return address
-- =============================================================================
CREATE TABLE IF NOT EXISTS mbl_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brokerage TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  license_number TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',

  -- Return address (verified via Lob)
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',

  -- Lob verified address ID
  lob_address_id TEXT,
  address_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Media (Supabase Storage paths)
  headshot_url TEXT,
  logo_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_agent_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_mbl_agents_user_id ON mbl_agents(user_id);

CREATE TRIGGER update_mbl_agents_updated_at
  BEFORE UPDATE ON mbl_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- mbl_campaigns — Letter campaigns with buyer criteria
-- =============================================================================
CREATE TABLE IF NOT EXISTS mbl_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES mbl_agents(id) ON DELETE CASCADE,

  -- Campaign status
  status TEXT NOT NULL DEFAULT 'searching'
    CHECK (status IN (
      'searching', 'skip_tracing', 'verifying', 'generating',
      'ready', 'sending', 'sent', 'delivered', 'error', 'cancelled'
    )),

  -- Buyer info
  buyer_name TEXT NOT NULL,
  buyer_description TEXT NOT NULL DEFAULT '',

  -- Search criteria
  criteria_price_min INTEGER,
  criteria_price_max INTEGER,
  criteria_beds_min INTEGER,
  criteria_baths_min NUMERIC(3,1),
  criteria_sqft_min INTEGER,
  criteria_sqft_max INTEGER,
  criteria_area TEXT NOT NULL DEFAULT '',
  criteria_city TEXT NOT NULL DEFAULT '',
  criteria_state TEXT NOT NULL DEFAULT '',
  criteria_zip TEXT NOT NULL DEFAULT '',

  -- Letter content
  template_style TEXT NOT NULL DEFAULT 'warm'
    CHECK (template_style IN ('warm', 'direct', 'luxury')),
  bullet_1 TEXT NOT NULL DEFAULT '',
  bullet_2 TEXT NOT NULL DEFAULT '',
  bullet_3 TEXT NOT NULL DEFAULT '',
  bullet_4 TEXT,

  -- Aggregates (updated as pipeline progresses)
  total_properties INTEGER NOT NULL DEFAULT 0,
  properties_skip_traced INTEGER NOT NULL DEFAULT 0,
  properties_verified INTEGER NOT NULL DEFAULT 0,
  properties_generated INTEGER NOT NULL DEFAULT 0,
  properties_sent INTEGER NOT NULL DEFAULT 0,
  properties_delivered INTEGER NOT NULL DEFAULT 0,
  properties_returned INTEGER NOT NULL DEFAULT 0,

  -- Payment
  stripe_session_id TEXT,
  stripe_payment_status TEXT DEFAULT 'unpaid'
    CHECK (stripe_payment_status IN ('unpaid', 'paid', 'refunded')),
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  price_per_letter_cents INTEGER NOT NULL DEFAULT 112,

  -- Error tracking
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mbl_campaigns_user_id ON mbl_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_mbl_campaigns_agent_id ON mbl_campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_mbl_campaigns_status ON mbl_campaigns(status);

CREATE TRIGGER update_mbl_campaigns_updated_at
  BEFORE UPDATE ON mbl_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- mbl_properties — Individual properties within a campaign
-- =============================================================================
CREATE TABLE IF NOT EXISTS mbl_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES mbl_campaigns(id) ON DELETE CASCADE,

  -- Property status
  status TEXT NOT NULL DEFAULT 'found'
    CHECK (status IN (
      'found', 'skip_traced', 'verified', 'generated',
      'sent', 'delivered', 'returned', 'send_failed', 'cancelled'
    )),

  -- Property data (from RealEstateAPI)
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- Property details
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  sqft INTEGER,
  lot_sqft INTEGER,
  year_built INTEGER,
  estimated_value INTEGER,
  last_sale_price INTEGER,
  last_sale_date DATE,
  equity_percent NUMERIC(5,2),
  years_owned NUMERIC(5,1),
  property_type TEXT NOT NULL DEFAULT '',

  -- Owner data (from skip trace)
  owner_first_name TEXT,
  owner_last_name TEXT,
  owner_type TEXT DEFAULT 'owner'
    CHECK (owner_type IN ('owner', 'absentee', 'investor', 'corporate', 'unknown')),
  owner_mailing_address TEXT,
  owner_phone TEXT,
  owner_email TEXT,

  -- Address verification (Lob)
  address_verified BOOLEAN NOT NULL DEFAULT FALSE,
  address_deliverable BOOLEAN,
  lob_verification_id TEXT,

  -- Letter generation (Claude AI)
  personalized_content JSONB,

  -- Lob letter
  lob_letter_id TEXT,
  lob_url TEXT,
  expected_delivery DATE,

  -- Delivery tracking
  delivery_status TEXT DEFAULT 'pending'
    CHECK (delivery_status IN (
      'pending', 'in_transit', 'in_local_area', 'processed_for_delivery',
      'delivered', 'returned', 're_routed', 'cancelled'
    )),
  delivery_events JSONB DEFAULT '[]'::jsonb,

  -- Selection
  selected BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mbl_properties_campaign_id ON mbl_properties(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mbl_properties_lob_letter_id ON mbl_properties(lob_letter_id);
CREATE INDEX IF NOT EXISTS idx_mbl_properties_status ON mbl_properties(status);

CREATE TRIGGER update_mbl_properties_updated_at
  BEFORE UPDATE ON mbl_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- mbl_agents
ALTER TABLE mbl_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_own" ON mbl_agents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "agents_insert_own" ON mbl_agents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "agents_update_own" ON mbl_agents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "agents_admin_select" ON mbl_agents
  FOR SELECT USING (is_admin());

-- mbl_campaigns
ALTER TABLE mbl_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own" ON mbl_campaigns
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "campaigns_insert_own" ON mbl_campaigns
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_update_own" ON mbl_campaigns
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "campaigns_delete_own" ON mbl_campaigns
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "campaigns_admin_select" ON mbl_campaigns
  FOR SELECT USING (is_admin());

-- mbl_properties
ALTER TABLE mbl_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_own" ON mbl_properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mbl_campaigns
      WHERE mbl_campaigns.id = mbl_properties.campaign_id
      AND mbl_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "properties_insert_own" ON mbl_properties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mbl_campaigns
      WHERE mbl_campaigns.id = mbl_properties.campaign_id
      AND mbl_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "properties_update_own" ON mbl_properties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mbl_campaigns
      WHERE mbl_campaigns.id = mbl_properties.campaign_id
      AND mbl_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "properties_admin_select" ON mbl_properties
  FOR SELECT USING (is_admin());
