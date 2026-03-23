-- =============================================================================
-- Allowed plans — admin-configured list of Memberstack plan IDs that grant
-- access to this satellite app. Users whose activePlanIds don't overlap
-- with this table see an upgrade page.
-- =============================================================================

CREATE TABLE IF NOT EXISTS allowed_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memberstack_plan_id TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE allowed_plans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage allowed plans
CREATE POLICY "Admins can manage allowed_plans"
  ON allowed_plans
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'superadmin')
  ));
