-- =============================================================================
-- Add active_plan_ids and is_team_member to users table
-- =============================================================================
-- These fields are synced from the Listing Leads satellite verify endpoint
-- on every SSO login. Used for content gating based on the user's plan.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_plan_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_team_member BOOLEAN NOT NULL DEFAULT false;
