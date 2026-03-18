-- Add buyer profile fields to mbl_campaigns for the new wizard flow
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS financing TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS closing_flexibility TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS condition_tolerance TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT '';
