-- Add lot size filter to campaign search criteria
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS criteria_lot_sqft_min INTEGER,
  ADD COLUMN IF NOT EXISTS criteria_lot_sqft_max INTEGER;
