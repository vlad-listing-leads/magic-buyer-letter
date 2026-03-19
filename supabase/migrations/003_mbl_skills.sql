-- Skills table: admin-configurable letter writing styles for Claude
CREATE TABLE mbl_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prompt_instructions TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_mbl_skills_updated_at ON mbl_skills;
CREATE TRIGGER update_mbl_skills_updated_at
  BEFORE UPDATE ON mbl_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE mbl_skills ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "Admins manage skills" ON mbl_skills;
CREATE POLICY "Admins manage skills" ON mbl_skills
  FOR ALL USING (is_admin());

-- Regular users can read active skills
DROP POLICY IF EXISTS "Users read active skills" ON mbl_skills;
CREATE POLICY "Users read active skills" ON mbl_skills
  FOR SELECT USING (is_active = TRUE);

-- Add multi-skill columns to campaigns and properties
ALTER TABLE mbl_campaigns
  ADD COLUMN IF NOT EXISTS letter_templates JSONB DEFAULT '{}'::jsonb,
  ALTER COLUMN template_style DROP NOT NULL;

ALTER TABLE mbl_properties
  ADD COLUMN IF NOT EXISTS personalized_content_by_skill JSONB DEFAULT '{}'::jsonb;

-- Seed initial skills from the hardcoded templates
INSERT INTO mbl_skills (name, description, prompt_instructions, sort_order) VALUES
(
  'Warm & Personal',
  'Friendly, heartfelt tone that builds an emotional connection',
  'Write in a warm, personal, conversational tone. Be genuine and relatable. Show deep respect for the homeowner and their home.',
  0
),
(
  'Straight to the Point',
  'Professional, concise, and focused on the opportunity',
  'Write in a professional, direct, and concise tone. Focus on the business opportunity. Be respectful but efficient with words.',
  1
),
(
  'Luxury',
  'Refined language for high-value properties and discerning owners',
  'Write in a refined, sophisticated tone. Use elevated language appropriate for high-value properties and discerning owners.',
  2
);
