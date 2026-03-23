-- Add channel to mbl_skills so each channel has its own set of skills
ALTER TABLE mbl_skills
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'letter'
    CHECK (channel IN ('letter', 'email', 'text', 'call_script'));
