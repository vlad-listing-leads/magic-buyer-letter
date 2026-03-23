-- =============================================================================
-- Campaign channels — stores generated content per channel per campaign
-- (email, text, call_script). One template per channel, not per property.
-- =============================================================================

CREATE TABLE IF NOT EXISTS mbl_campaign_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES mbl_campaigns(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'text', 'call_script')),
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_campaign_channels_campaign_id ON mbl_campaign_channels(campaign_id);

ALTER TABLE mbl_campaign_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign channels"
  ON mbl_campaign_channels FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mbl_campaigns c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = mbl_campaign_channels.campaign_id
    AND u.id = auth.uid()
  ));

CREATE POLICY "Users can insert own campaign channels"
  ON mbl_campaign_channels FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM mbl_campaigns c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = mbl_campaign_channels.campaign_id
    AND u.id = auth.uid()
  ));

DROP TRIGGER IF EXISTS update_campaign_channels_updated_at ON mbl_campaign_channels;
CREATE TRIGGER update_campaign_channels_updated_at
  BEFORE UPDATE ON mbl_campaign_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
