'use client'

import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { Download, Mail, MapPin, FileText, Pencil, Loader2, RefreshCw } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { sileo } from 'sileo'
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
  letterTemplates?: Record<string, { body: string; ps?: string }> | null
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
  letterTemplates,
}: LetterPreviewWizardProps) {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const [letterDesign, setLetterDesign] = useState<'classic' | 'map'>('classic')
  const [editOpen, setEditOpen] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editPs, setEditPs] = useState('')
  const [customContent, setCustomContent] = useState<{ body: string; ps: string } | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

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

  // === SINGLE SOURCE OF TRUTH: _active ===
  // 1. _active exists → use it (user saved or auto-saved)
  // 2. No _active → find first available content, auto-save as _active
  // That's it. No skill switching, no property fallback, no ambiguity.

  const activeTemplate = letterTemplates?.['_active'] ?? null

  const resolvedContent: { body: string; ps: string } = (() => {
    // User's in-session edit (not yet saved to DB)
    if (customContent) return customContent
    // Saved _active — the single source of truth
    if (activeTemplate?.body) return { body: activeTemplate.body, ps: activeTemplate.ps ?? '' }
    // Fallback: find ANY content to bootstrap from (first skill template or property content)
    if (letterTemplates) {
      const firstSkill = Object.entries(letterTemplates).find(([k]) => k !== '_active')?.[1]
      if (firstSkill?.body) return { body: firstSkill.body, ps: firstSkill.ps ?? '' }
    }
    const propContent = properties.find(p => p.personalized_content)?.personalized_content as { body?: string; ps?: string } | null
    if (propContent?.body) return { body: propContent.body, ps: propContent.ps ?? '' }
    return { body: '', ps: '' }
  })()

  const currentContent = resolvedContent

  // Auto-save _active if it doesn't exist yet but we found content from another source
  const hasSavedActive = React.useRef(false)
  React.useEffect(() => {
    if (hasSavedActive.current || !campaignId || !currentContent.body || activeTemplate?.body) return
    hasSavedActive.current = true
    apiFetch(`/api/mbl/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letter_templates: { _active: currentContent } }),
    }).catch(() => {})
  }, [campaignId, currentContent, activeTemplate, apiFetch])

  const handleOpenEdit = () => {
    setEditBody(currentContent?.body ?? '')
    setEditPs(currentContent?.ps ?? '')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    const newContent = { body: editBody, ps: editPs }
    setCustomContent(newContent)
    setEditOpen(false)

    // Persist to DB — update letter_templates on the campaign
    if (campaignId) {
      try {
        const updatedTemplates = { _active: newContent }
        const res = await apiFetch(`/api/mbl/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ letter_templates: updatedTemplates }),
        })
        if (!res.ok) throw new Error('Save failed')
        // Invalidate cache so refresh shows saved content
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
        sileo.success({ title: 'Letter saved' })
      } catch {
        sileo.error({ title: 'Failed to save letter' })
      }
    }
  }

  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    try {
      const letterEl = document.querySelector('[data-letter-preview]') as HTMLElement
      if (!letterEl) return

      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      const result = await html2canvas(letterEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcfa',
        logging: false,
      })

      const imgData = result.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })
      pdf.addImage(imgData, 'PNG', 0, 0, 8.5, 11)

      const name = buyerName || 'buyer'
      pdf.save(`${name.replace(/[^a-zA-Z0-9]/g, '_')}_letter.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!campaignId || properties.length === 0) return
    setIsRegenerating(true)
    try {
      // Clear _active so generate endpoint writes fresh content
      await apiFetch(`/api/mbl/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter_templates: { _active: null } }),
      })

      const res = await apiFetch(`/api/mbl/campaigns/${campaignId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_ids: properties.map((p) => p.id) }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Regeneration failed')
      }

      // Consume the SSE stream
      const reader = res.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          buffer = buffer.split('\n').pop() ?? ''
        }
      }

      // Regenerate non-letter channels too (email, text, call_script)
      try {
        const campaignRes = await apiFetch(`/api/mbl/campaigns/${campaignId}`)
        const campaignJson = await campaignRes.json()
        const selectedChannels: string[] = campaignJson.data?.campaign?.selected_channels ?? []
        const nonLetterChannels = selectedChannels.filter(
          (ch: string) => ch !== 'letter' && ch !== 'social_post'
        )
        await Promise.all(
          nonLetterChannels.map((channel: string) =>
            apiFetch(`/api/mbl/campaigns/${campaignId}/generate-channel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channel }),
            }).catch(() => {})
          )
        )
      } catch {
        // Non-fatal — letter was regenerated even if channels fail
      }

      // Clear local edits and refresh from server
      setCustomContent(null)
      hasSavedActive.current = false
      await queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
      await queryClient.invalidateQueries({ queryKey: ['campaign-channels', campaignId] })
      sileo.success({ title: 'All content regenerated' })
    } catch (err) {
      sileo.error({ title: err instanceof Error ? err.message : 'Failed to regenerate' })
    } finally {
      setIsRegenerating(false)
    }
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
        <div className="flex items-center gap-2">
          {campaignId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="gap-1.5 text-xs"
            >
              {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerate
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEdit}
            className="gap-1.5 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="gap-1.5 text-xs"
          >
            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
          </Button>
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
      </div>

      {/* Letter preview */}
      <div className="max-w-[740px] mx-auto">
        <div className="rounded-xl bg-stone-200 dark:bg-[#282524] px-2 pt-2 pb-2">
          {letterDesign === 'map' ? (
            <LetterPreviewWithMap
              agent={agent}
              letterContent={currentContent}
              allProperties={properties}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              editedContent={currentContent}
            />
          ) : (
            <LetterPreview
              agent={agent}
              letterContent={currentContent}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              editedContent={currentContent}
            />
          )}
        </div>
      </div>

      {/* Bottom spacing for sticky footer */}
      <div className="h-16" />

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg px-6">
          <SheetHeader>
            <SheetTitle>Edit Letter</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Letter Body</label>
              <p className="text-xs text-muted-foreground">
                Use placeholders: {'{{property_address}}'}, {'{{neighborhood}}'}, {'{{buyer_name}}'}, {'{{agent_name}}'}, {'{{agent_phone}}'}
              </p>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={18}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">P.S. (optional)</label>
              <textarea
                value={editPs}
                onChange={(e) => setEditPs(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="P.S. Add a personal note..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1 bg-[#006AFF] hover:bg-[#0058D4] text-white">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
