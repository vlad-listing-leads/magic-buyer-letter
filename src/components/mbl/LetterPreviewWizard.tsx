'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LetterPreview } from './LetterPreview'
import { EnvelopeMockup } from './EnvelopeMockup'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'

interface LetterPreviewWizardProps {
  agent: MblAgent
  properties: MblProperty[]
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  onTemplateChange: (style: TemplateStyle) => void
  onBack: () => void
  onContinue: () => void
}

export function LetterPreviewWizard({
  agent,
  properties,
  buyerName,
  bullets,
  templateStyle,
  onBack,
  onContinue,
}: LetterPreviewWizardProps) {
  const apiFetch = useApiFetch()
  const [envelopeType, setEnvelopeType] = useState<'standard' | 'custom'>('standard')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

  // Fetch active skills
  const { data: skills } = useQuery<{ id: string; name: string; description: string }[]>({
    queryKey: ['active-skills'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/skills')
      const json = await res.json()
      return json.data ?? []
    },
  })

  const activeSkills = skills ?? []
  const hasMultipleSkills = activeSkills.length > 1

  // Auto-select first skill when loaded
  if (activeSkills.length > 0 && selectedSkill === null) {
    setSelectedSkill(activeSkills[0].id)
  }

  // Find a sample property with per-skill content
  const sampleProperty =
    properties.find((p) => p.personalized_content) ?? properties[0] ?? null

  // Helper to get per-skill content for preview
  const getSkillContent = (skillId: string) => {
    const bySkill = (sampleProperty as unknown as Record<string, unknown>)?.personalized_content_by_skill as Record<string, { body: string; ps: string }> | null
    const content = bySkill?.[skillId]
    if (content) {
      return { body: content.body, ps: content.ps }
    }
    return undefined
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Preview what {buyerName || 'your buyer'}&apos;s homeowners will receive
        </h2>
        <p className="text-muted-foreground">
          {hasMultipleSkills
            ? `${activeSkills.length} letter styles generated — review each one`
            : 'Review your letter below'}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Skill selector — pill buttons, not tabs */}
        {hasMultipleSkills && (
          <div className="flex justify-center gap-2">
            {activeSkills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedSkill(skill.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedSkill === skill.id
                    ? 'bg-[#006AFF] text-white shadow-md shadow-[#006AFF]/20'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}

        {/* Preview container — dark background to frame the letter */}
        <div className="rounded-xl bg-stone-200 dark:bg-[#282524] px-2 pt-2 pb-2">
          <Tabs defaultValue="letter" className="gap-2">
            <TabsList>
              <TabsTrigger value="letter">Letter Page 1</TabsTrigger>
              <TabsTrigger value="envelope">Envelope Front</TabsTrigger>
            </TabsList>

            <TabsContent value="letter">
              <LetterPreview
                agent={agent}
                property={sampleProperty}
                buyerName={buyerName}
                bullets={bullets}
                templateStyle={templateStyle}
                editedContent={selectedSkill ? getSkillContent(selectedSkill) : undefined}
              />
            </TabsContent>

            <TabsContent value="envelope">
              <EnvelopeMockup agent={agent} property={sampleProperty} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Envelope type selector */}
      <div className="max-w-2xl mx-auto flex gap-3">
        <button
          type="button"
          onClick={() => setEnvelopeType('standard')}
          className={`flex-1 p-3 rounded-lg border text-left text-sm transition-colors ${
            envelopeType === 'standard'
              ? 'border-[#006AFF] bg-[#006AFF]/5'
              : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <span className="font-medium">Standard #10</span>
          <span className="block text-xs text-muted-foreground">Included</span>
        </button>
        <button
          type="button"
          onClick={() => setEnvelopeType('custom')}
          disabled
          className="flex-1 p-3 rounded-lg border border-border text-left text-sm opacity-50 cursor-not-allowed"
        >
          <span className="font-medium">Custom branded</span>
          <span className="block text-xs text-muted-foreground">Enterprise tier</span>
        </button>
      </div>

      {/* Actions */}
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onContinue}
          className="bg-[#006AFF] hover:bg-[#0058D4] text-white px-8"
          size="lg"
        >
          Choose audience
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
