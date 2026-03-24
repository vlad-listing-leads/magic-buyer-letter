'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { Download, Mail, MapPin, FileText } from 'lucide-react'
import { LetterPreview } from './LetterPreview'
import { LetterPreviewWithMap } from './LetterPreviewWithMap'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'

interface LetterPreviewWizardProps {
  agent: MblAgent
  properties: MblProperty[]
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  onTemplateChange: (style: TemplateStyle) => void
  selectedSkillId: string | null
  onSkillChange: (skillId: string | null) => void
  onBack: () => void
  onContinue: () => void
  campaignId?: string | null
}

export function LetterPreviewWizard({
  agent,
  properties,
  buyerName,
  bullets,
  templateStyle,
  selectedSkillId,
  onSkillChange,
  onBack,
  onContinue,
  campaignId,
}: LetterPreviewWizardProps) {
  const apiFetch = useApiFetch()
  const [letterDesign, setLetterDesign] = useState<'classic' | 'map'>('classic')

  const { data: skills } = useQuery<{ id: string; name: string; description: string; channel: string }[]>({
    queryKey: ['active-skills'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/skills')
      const json = await res.json()
      return json.data ?? []
    },
  })

  // Only show letter skills on the letter preview
  const activeSkills = (skills ?? []).filter((s) => s.channel === 'letter')
  const hasMultipleSkills = activeSkills.length > 1

  React.useEffect(() => {
    if (activeSkills.length > 0 && selectedSkillId === null) {
      onSkillChange(activeSkills[0].id)
    }
  }, [activeSkills, selectedSkillId, onSkillChange])

  const sampleProperty =
    properties.find((p) => p.personalized_content) ?? properties[0] ?? null

  const getSkillContent = (skillId: string) => {
    const bySkill = (sampleProperty as unknown as Record<string, unknown>)?.personalized_content_by_skill as Record<string, { body: string; ps: string }> | null
    return bySkill?.[skillId] ?? undefined
  }

  if (!skills) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Loading preview...</h2>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#006AFF] border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Skill selector — pill buttons */}
      {hasMultipleSkills && (
        <div className="flex justify-center gap-2">
          {activeSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => onSkillChange(skill.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedSkillId === skill.id
                  ? 'bg-[#006AFF] text-white shadow-md shadow-[#006AFF]/20'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {skill.name}
            </button>
          ))}
        </div>
      )}

      {/* Letter header with design toggle + download */}
      <div className="max-w-[740px] mx-auto flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLetterDesign('classic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              letterDesign === 'classic'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Classic
          </button>
          <button
            type="button"
            onClick={() => setLetterDesign('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              letterDesign === 'map'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            With Map
          </button>
        </div>
        {campaignId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/mbl/campaigns/${campaignId}/export`, '_blank')}
            className="gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download Addresses
          </Button>
        )}
      </div>

      {/* Letter preview */}
      <div className="max-w-[740px] mx-auto">
        <div className="rounded-xl bg-stone-200 dark:bg-[#282524] px-2 pt-2 pb-2">
          {letterDesign === 'map' ? (
            <LetterPreviewWithMap
              agent={agent}
              property={sampleProperty}
              allProperties={properties}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              editedContent={selectedSkillId ? getSkillContent(selectedSkillId) : undefined}
            />
          ) : (
            <LetterPreview
              agent={agent}
              property={sampleProperty}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              editedContent={selectedSkillId ? getSkillContent(selectedSkillId) : undefined}
            />
          )}
        </div>
      </div>

      {/* Bottom spacing for sticky footer */}
      <div className="h-16" />
    </div>
  )
}
