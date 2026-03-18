'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { LETTER_TEMPLATES } from '@/lib/templates'
import type { PropertySearchCriteria, TemplateStyle } from '@/types'
import { cn } from '@/lib/utils'

interface BuyerDetailsProps {
  initialName: string
  initialCriteria: PropertySearchCriteria
  onBack: () => void
  onComplete: (data: {
    buyer_name: string
    criteria: PropertySearchCriteria
    template_style: TemplateStyle
    bullet_1: string
    bullet_2: string
    bullet_3: string
    bullet_4: string
  }) => void
}

export function BuyerDetails({ initialName, initialCriteria, onBack, onComplete }: BuyerDetailsProps) {
  const [buyerName, setBuyerName] = useState(initialName)
  const [criteria, setCriteria] = useState<PropertySearchCriteria>(initialCriteria)
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('warm')
  const [bullets, setBullets] = useState({ b1: '', b2: '', b3: '', b4: '' })

  const updateCriteria = (field: keyof PropertySearchCriteria, value: string) => {
    setCriteria(prev => ({
      ...prev,
      [field]: value ? (field === 'city' || field === 'state' || field === 'zip' || field === 'area' ? value : Number(value)) : undefined,
    }))
  }

  const canContinue = buyerName.trim() && (criteria.city || criteria.zip || criteria.state) && bullets.b1.trim()

  const handleSubmit = () => {
    onComplete({
      buyer_name: buyerName,
      criteria,
      template_style: templateStyle,
      bullet_1: bullets.b1,
      bullet_2: bullets.b2,
      bullet_3: bullets.b3,
      bullet_4: bullets.b4,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Buyer Details</h2>
        <p className="text-muted-foreground">
          Confirm the search criteria and add selling points
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Buyer Name */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buyer Name *</label>
              <Input
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                placeholder="Sarah and Mike"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Search Criteria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Criteria</CardTitle>
            <CardDescription>Used to find matching properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={criteria.city ?? ''}
                  onChange={e => updateCriteria('city', e.target.value)}
                  placeholder="Newton"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Input
                  value={criteria.state ?? ''}
                  onChange={e => updateCriteria('state', e.target.value)}
                  placeholder="MA"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ZIP</label>
                <Input
                  value={criteria.zip ?? ''}
                  onChange={e => updateCriteria('zip', e.target.value)}
                  placeholder="02458"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Min</label>
                <Input
                  type="number"
                  value={criteria.price_min ?? ''}
                  onChange={e => updateCriteria('price_min', e.target.value)}
                  placeholder="400000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Max</label>
                <Input
                  type="number"
                  value={criteria.price_max ?? ''}
                  onChange={e => updateCriteria('price_max', e.target.value)}
                  placeholder="600000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Beds (min)</label>
                <Input
                  type="number"
                  value={criteria.beds_min ?? ''}
                  onChange={e => updateCriteria('beds_min', e.target.value)}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Baths (min)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={criteria.baths_min ?? ''}
                  onChange={e => updateCriteria('baths_min', e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sqft Min</label>
                <Input
                  type="number"
                  value={criteria.sqft_min ?? ''}
                  onChange={e => updateCriteria('sqft_min', e.target.value)}
                  placeholder="1500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sqft Max</label>
                <Input
                  type="number"
                  value={criteria.sqft_max ?? ''}
                  onChange={e => updateCriteria('sqft_max', e.target.value)}
                  placeholder="3000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bullet Points */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buyer Selling Points</CardTitle>
            <CardDescription>These appear in the letter to build credibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bullet 1 *</label>
              <Input
                value={bullets.b1}
                onChange={e => setBullets(prev => ({ ...prev, b1: e.target.value }))}
                placeholder="They're pre-approved for up to $650,000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bullet 2</label>
              <Input
                value={bullets.b2}
                onChange={e => setBullets(prev => ({ ...prev, b2: e.target.value }))}
                placeholder="They can close on your timeline — no rush, no pressure"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bullet 3</label>
              <Input
                value={bullets.b3}
                onChange={e => setBullets(prev => ({ ...prev, b3: e.target.value }))}
                placeholder="They love the neighborhood and plan to stay long-term"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bullet 4 (optional)</label>
              <Input
                value={bullets.b4}
                onChange={e => setBullets(prev => ({ ...prev, b4: e.target.value }))}
                placeholder="Optional additional selling point"
              />
            </div>
          </CardContent>
        </Card>

        {/* Template Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letter Tone</CardTitle>
            <CardDescription>Choose the writing style for your letters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {LETTER_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateStyle(template.id)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    templateStyle === template.id
                      ? 'border-[#006AFF] bg-[#006AFF]/5'
                      : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canContinue}
            className="bg-[#006AFF] hover:bg-[#0058D4] text-white px-8"
            size="lg"
          >
            Find Properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
