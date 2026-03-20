-- Add years_owned_min criteria to mbl_campaigns (was collected in UI but never persisted)
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS criteria_years_owned_min INTEGER DEFAULT NULL;
