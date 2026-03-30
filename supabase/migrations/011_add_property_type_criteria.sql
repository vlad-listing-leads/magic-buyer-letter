-- Add property type filter to campaign search criteria
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS criteria_property_type TEXT;
