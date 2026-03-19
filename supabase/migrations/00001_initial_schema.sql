-- =============================================================================
-- Listing Leads Satellite App — Initial Schema
-- =============================================================================
-- This migration creates the core tables needed by any LL satellite app.
-- Customize and extend as needed for your specific app.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Users table — local user records linked to Listing Leads via memberstack_id
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  memberstack_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for memberstack_id lookups (already unique, but explicit)
CREATE INDEX IF NOT EXISTS idx_users_memberstack_id ON users(memberstack_id);

-- =============================================================================
-- Auto-update updated_at trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admin helper function (use in RLS policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can read all users
DROP POLICY IF EXISTS "admins_select_all" ON users;
CREATE POLICY "admins_select_all" ON users
  FOR SELECT
  USING (is_admin());

-- Admins can insert users (for SSO callback)
DROP POLICY IF EXISTS "admins_insert" ON users;
CREATE POLICY "admins_insert" ON users
  FOR INSERT
  WITH CHECK (is_admin());

-- Service role bypasses RLS (used by admin client)
-- No additional policy needed — service role key bypasses all RLS
