'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LetterPreview } from './LetterPreview'
import type { LetterContent } from './LetterPreview'
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
  const sampleProperty =
    properties.find((p) => p.personalized_content) ?? properties[0] ?? null

  const [envelopeType, setEnvelopeType] = useState<'standard' | 'custom'>('standard')
  const [editedContent, setEditedContent] = useState<Partial<LetterContent>>({})

  const personalized = sampleProperty?.personalized_content
  const address = sampleProperty
    ? `${sampleProperty.address_line1}, ${sampleProperty.city}`
    : '123 Main St, Your City'
  const neighborhood = sampleProperty?.neighborhood || 'the area'

  // Resolved defaults for form fields
  const currentBullet1 = editedContent.bullet_1 ?? personalized?.bullet_1 ?? bullets.b1 ?? ''
  const currentBullet2 = editedContent.bullet_2 ?? personalized?.bullet_2 ?? bullets.b2 ?? ''
  const currentBullet3 = editedContent.bullet_3 ?? personalized?.bullet_3 ?? bullets.b3 ?? ''
  const currentOpening = editedContent.opening
    ?? personalized?.opening
    ?? `Your home at ${address} is one of the only properties that my clients, ${buyerName || 'my buyers'}, would seriously consider buying in ${neighborhood}.`
  const currentClosing = editedContent.closing ?? personalized?.closing ?? 'I look forward to hearing from you,'

  const updateField = (field: keyof LetterContent, value: string) => {
    setEditedContent((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          Preview what {buyerName || 'your buyer'}&apos;s homeowners will receive
        </h2>
        <p className="text-muted-foreground">Customize your letter, then preview below</p>
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

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Edit form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customize Letter</CardTitle>
            <CardDescription>Edit the content below — preview updates live</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Opening line</label>
              <textarea
                value={currentOpening}
                onChange={(e) => updateField('opening', e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bullet 1</label>
                <Input
                  value={currentBullet1}
                  onChange={(e) => updateField('bullet_1', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bullet 2</label>
                <Input
                  value={currentBullet2}
                  onChange={(e) => updateField('bullet_2', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bullet 3</label>
                <Input
                  value={currentBullet3}
                  onChange={(e) => updateField('bullet_3', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Closing line</label>
              <Input
                value={currentClosing}
                onChange={(e) => updateField('closing', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Letter / Envelope preview tabs */}
        <Tabs defaultValue="letter">
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
              editedContent={editedContent}
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
