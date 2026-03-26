// @vitest-environment node
import { describe, it, expect } from 'vitest'

/**
 * Letter content resolution tests.
 *
 * The ONLY source of truth for letter content is campaign.letter_templates._active
 * Everything else is a bootstrap fallback that gets auto-saved to _active.
 */

// Simulate the resolution logic from LetterPreviewWizard
function resolveLetterContent(opts: {
  customContent?: { body: string; ps: string } | null
  letterTemplates?: Record<string, { body: string; ps?: string }> | null
  propertyContent?: { body?: string; ps?: string } | null
}): { body: string; ps: string } {
  const { customContent, letterTemplates, propertyContent } = opts

  // User's in-session edit
  if (customContent) return customContent

  // _active — single source of truth
  const active = letterTemplates?.['_active']
  if (active?.body) return { body: active.body, ps: active.ps ?? '' }

  // Fallback: first skill template
  if (letterTemplates) {
    const firstSkill = Object.entries(letterTemplates).find(([k]) => k !== '_active')?.[1]
    if (firstSkill?.body) return { body: firstSkill.body, ps: firstSkill.ps ?? '' }
  }

  // Fallback: property content (old campaigns)
  if (propertyContent?.body) return { body: propertyContent.body, ps: propertyContent.ps ?? '' }

  return { body: '', ps: '' }
}

// Simulate what the generate endpoint saves
function generateLetterTemplates(opts: {
  existingActive?: { body: string; ps?: string } | null
  generatedSkills: Record<string, { body: string; ps?: string }>
}): Record<string, { body: string; ps?: string }> {
  const firstGenerated = Object.values(opts.generatedSkills)[0]
  return {
    ...opts.generatedSkills,
    _active: opts.existingActive ?? firstGenerated,
  }
}

// Simulate what the PATCH merge does
function mergeLetterTemplates(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  return { ...existing, ...incoming }
}

describe('Letter Content Resolution', () => {
  it('returns _active when it exists', () => {
    const result = resolveLetterContent({
      letterTemplates: {
        _active: { body: 'User edited letter', ps: 'PS text' },
        skill_1: { body: 'AI generated letter 1' },
        skill_2: { body: 'AI generated letter 2' },
      },
    })
    expect(result.body).toBe('User edited letter')
    expect(result.ps).toBe('PS text')
  })

  it('_active wins over skill templates', () => {
    const result = resolveLetterContent({
      letterTemplates: {
        skill_1: { body: 'Skill 1 content' },
        _active: { body: 'User saved content' },
        skill_2: { body: 'Skill 2 content' },
      },
    })
    expect(result.body).toBe('User saved content')
  })

  it('_active wins over property content', () => {
    const result = resolveLetterContent({
      letterTemplates: {
        _active: { body: 'Active content' },
      },
      propertyContent: { body: 'Old property content' },
    })
    expect(result.body).toBe('Active content')
  })

  it('customContent wins over everything', () => {
    const result = resolveLetterContent({
      customContent: { body: 'Just edited this', ps: '' },
      letterTemplates: {
        _active: { body: 'Previously saved' },
        skill_1: { body: 'AI generated' },
      },
      propertyContent: { body: 'Old property' },
    })
    expect(result.body).toBe('Just edited this')
  })

  it('falls back to first skill template when no _active', () => {
    const result = resolveLetterContent({
      letterTemplates: {
        skill_1: { body: 'First skill letter' },
        skill_2: { body: 'Second skill letter' },
      },
    })
    expect(result.body).toBe('First skill letter')
  })

  it('falls back to property content when no templates at all', () => {
    const result = resolveLetterContent({
      letterTemplates: null,
      propertyContent: { body: 'Legacy property letter', ps: 'PS' },
    })
    expect(result.body).toBe('Legacy property letter')
  })

  it('returns empty when nothing exists', () => {
    const result = resolveLetterContent({
      letterTemplates: null,
      propertyContent: null,
    })
    expect(result.body).toBe('')
    expect(result.ps).toBe('')
  })

  it('returns empty when letter_templates is empty object', () => {
    const result = resolveLetterContent({
      letterTemplates: {},
    })
    expect(result.body).toBe('')
  })

  it('handles _active with empty ps', () => {
    const result = resolveLetterContent({
      letterTemplates: {
        _active: { body: 'Content here' },
      },
    })
    expect(result.ps).toBe('')
  })
})

describe('Generate Endpoint — _active Handling', () => {
  it('sets _active to first generated template when none exists', () => {
    const result = generateLetterTemplates({
      existingActive: null,
      generatedSkills: {
        skill_1: { body: 'Generated 1' },
        skill_2: { body: 'Generated 2' },
      },
    })
    expect(result._active.body).toBe('Generated 1')
    expect(result.skill_1.body).toBe('Generated 1')
    expect(result.skill_2.body).toBe('Generated 2')
  })

  it('preserves existing _active when regenerating', () => {
    const result = generateLetterTemplates({
      existingActive: { body: 'User saved this', ps: 'Keep this PS' },
      generatedSkills: {
        skill_1: { body: 'New generation 1' },
        skill_2: { body: 'New generation 2' },
      },
    })
    expect(result._active.body).toBe('User saved this')
    expect(result._active.ps).toBe('Keep this PS')
    // Skill templates are updated
    expect(result.skill_1.body).toBe('New generation 1')
  })
})

describe('PATCH Merge — Letter Templates', () => {
  it('merges _active into existing templates', () => {
    const existing = {
      skill_1: { body: 'Skill 1' },
      skill_2: { body: 'Skill 2' },
    }
    const incoming = {
      _active: { body: 'User edit' },
    }
    const result = mergeLetterTemplates(existing, incoming)
    expect(result._active).toEqual({ body: 'User edit' })
    expect(result.skill_1).toEqual({ body: 'Skill 1' })
  })

  it('overwrites _active when saving new edit', () => {
    const existing = {
      _active: { body: 'Old edit' },
      skill_1: { body: 'Skill 1' },
    }
    const incoming = {
      _active: { body: 'New edit' },
    }
    const result = mergeLetterTemplates(existing, incoming)
    expect(result._active).toEqual({ body: 'New edit' })
  })
})

describe('Admin View — Same Content as User', () => {
  it('admin reads _active which matches user view', () => {
    const campaignTemplates = {
      _active: { body: 'The real letter', ps: 'Real PS' },
      skill_1: { body: 'Different skill content' },
      skill_2: { body: 'Another skill content' },
    }

    // User view (resolveLetterContent)
    const userView = resolveLetterContent({ letterTemplates: campaignTemplates })

    // Admin view (reads _active directly)
    const adminView = campaignTemplates['_active']

    expect(userView.body).toBe(adminView.body)
    expect(userView.ps).toBe(adminView.ps)
  })

  it('admin sees null when no _active (campaign needs to be opened by user first)', () => {
    const campaignTemplates = {
      skill_1: { body: 'Skill content' },
    }
    const adminView = campaignTemplates['_active' as keyof typeof campaignTemplates] ?? null
    expect(adminView).toBeNull()
  })
})
