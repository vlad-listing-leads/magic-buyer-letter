'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LetterEditor } from './LetterEditor'
import { EnvelopeMockup } from './EnvelopeMockup'
import type { JSONContent } from 'novel'
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
  const sampleProperty =
    properties.find((p) => p.personalized_content) ?? properties[0] ?? null

  const [envelopeType, setEnvelopeType] = useState<'standard' | 'custom'>('standard')
  const [_letterJSON, setLetterJSON] = useState<JSONContent | null>(null)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Preview what {buyerName || 'your buyer'}&apos;s homeowners will receive
        </h2>
        <p className="text-muted-foreground">Edit the letter directly — it works like a doc</p>
      </div>

      {/* Template style selector */}
      <div className="flex justify-center">
        <Tabs defaultValue={templateStyle} onValueChange={(v) => onTemplateChange(v as TemplateStyle)}>
          <TabsList>
            <TabsTrigger value="warm">Warm + Personal</TabsTrigger>
            <TabsTrigger value="direct">Straight to the Point</TabsTrigger>
            <TabsTrigger value="luxury">Luxury</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Letter / Envelope tabs */}
      <div className="max-w-2xl mx-auto">
        <Tabs defaultValue="letter">
          <TabsList>
            <TabsTrigger value="letter">Letter Page 1</TabsTrigger>
            <TabsTrigger value="envelope">Envelope Front</TabsTrigger>
          </TabsList>

          <TabsContent value="letter">
            <LetterEditor
              agent={agent}
              property={sampleProperty}
              buyerName={buyerName}
              bullets={bullets}
              templateStyle={templateStyle}
              onContentChange={setLetterJSON}
            />
          </TabsContent>

          <TabsContent value="envelope">
            <div className="space-y-4">
              <EnvelopeMockup agent={agent} property={sampleProperty} />

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
          </TabsContent>
        </Tabs>
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
