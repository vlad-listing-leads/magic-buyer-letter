-- Add neighborhoods filter to campaigns
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS criteria_neighborhoods text[] DEFAULT '{}';
