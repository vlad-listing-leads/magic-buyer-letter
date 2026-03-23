-- Add selected_channels to campaigns to track which channels the user chose
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS selected_channels TEXT[] NOT NULL DEFAULT '{}';
