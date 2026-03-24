'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Button } from '@/components/ui/button'
import { Download, Mail, MapPin, FileText, Pencil, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  const [editOpen, setEditOpen] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editPs, setEditPs] = useState('')
  const [customContent, setCustomContent] = useState<{ body: string; ps: string } | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

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

  // Resolve current content: custom edit > skill content > personalized content
  const currentContent = customContent
    ?? (selectedSkillId ? getSkillContent(selectedSkillId) : undefined)
    ?? (sampleProperty?.personalized_content as { body: string; ps: string } | null)
    ?? { body: '', ps: '' }

  const handleOpenEdit = () => {
    setEditBody(currentContent?.body ?? '')
    setEditPs(currentContent?.ps ?? '')
    setEditOpen(true)
  }

  const handleSaveEdit = () => {
    setCustomContent({ body: editBody, ps: editPs })
    setEditOpen(false)
  }

  const handleDownloadPDF = async () => {
    const letterEl = document.querySelector('[data-letter-preview]') as HTMLElement
    if (!letterEl) return

    setIsDownloading(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const { jsPDF } = await import('jspdf')

      // Replace ALL WebGL canvases with static images before capture
      const canvases = letterEl.querySelectorAll('canvas')
      const swaps: Array<{ canvas: HTMLCanvasElement; img: HTMLImageElement }> = []

      canvases.forEach((c) => {
        try {
          const img = document.createElement('img')
          img.src = c.toDataURL('image/png')
          img.style.position = 'absolute'
          img.style.inset = '0'
          img.style.width = '100%'
          img.style.height = '100%'
          img.style.objectFit = 'cover'
          img.style.zIndex = '999'
          c.parentElement?.insertBefore(img, c)
          swaps.push({ canvas: c, img })
        } catch {
          // canvas tainted, skip
        }
      })

      // Small delay for images to render
      await new Promise((r) => setTimeout(r, 100))

      const result = await html2canvas(letterEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfcfa',
        logging: false,
        onclone: (clonedDoc) => {
          // Also hide any maplibre-gl elements that html2canvas can't render
          const mapEls = clonedDoc.querySelectorAll('.maplibregl-canvas-container')
          mapEls.forEach((el) => {
            const htmlEl = el as HTMLElement
            htmlEl.style.overflow = 'hidden'
          })
        },
      })

      // Remove temp images
      swaps.forEach(({ img }) => {
        img.remove()
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
              property={sampleProperty}
              allProperties={properties}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              editedContent={customContent ?? (selectedSkillId ? getSkillContent(selectedSkillId) : undefined)}
            />
          ) : (
            <LetterPreview
              agent={agent}
              property={sampleProperty}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              editedContent={customContent ?? (selectedSkillId ? getSkillContent(selectedSkillId) : undefined)}
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
