'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  onTemplateChange,
  onBack,
  onContinue,
}: LetterPreviewWizardProps) {
  // Pick a sample property for preview (first with personalized_content, or first overall)
  const sampleProperty =
    properties.find((p) => p.personalized_content) ?? properties[0] ?? null

  const [envelopeType, setEnvelopeType] = useState<'standard' | 'custom'>('standard')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Preview what {buyerName || 'your buyer'}&apos;s homeowners will receive
        </h2>
        <p className="text-muted-foreground">Envelope front + letter page 1</p>
      </div>

      {/* Template selector */}
      <div className="flex justify-center gap-2">
        {(['warm', 'direct', 'luxury'] as const).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => onTemplateChange(style)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              templateStyle === style
                ? 'bg-[#006AFF] text-white'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {style === 'warm' ? 'Warm + Personal' : style === 'direct' ? 'Straight to the Point' : 'Luxury'}
          </button>
        ))}
      </div>

      {/* Two-column preview */}
      <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-2">
        {/* Left — Envelope */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Envelope front</h3>
          <EnvelopeMockup agent={agent} property={sampleProperty} />

          {/* Envelope type selector */}
          <div className="flex gap-3">
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
        </div>

        {/* Right — Letter */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Letter page 1</h3>
          <LetterPreview
            agent={agent}
            property={sampleProperty}
            buyerName={buyerName}
            bullets={bullets}
            templateStyle={templateStyle}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-5xl mx-auto flex items-center justify-between">
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
