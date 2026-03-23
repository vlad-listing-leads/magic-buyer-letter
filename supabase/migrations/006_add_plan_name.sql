-- Add plan_name to users table
-- Resolved from LL database (solo_plan_ids → solo_plans) during SSO login.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan_name TEXT;
