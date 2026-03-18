'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApiFetch } from '@/hooks/useApiFetch'
import { SmartInput } from '@/components/mbl/SmartInput'
import { BuyerDetails } from '@/components/mbl/BuyerDetails'
import { PipelineLoading } from '@/components/mbl/PipelineLoading'
import { toast } from 'sonner'
import type { PropertySearchCriteria, TemplateStyle, CampaignCreateData } from '@/types'

type WizardStep = 'input' | 'details' | 'pipeline'

export default function NewLetterPage() {
  const router = useRouter()
  const apiFetch = useApiFetch()
  const [step, setStep] = useState<WizardStep>('input')

  // Shared state between steps
  const [buyerName, setBuyerName] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState<PropertySearchCriteria>({})
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  const handleSmartInputComplete = (name: string, desc: string, parsedCriteria: PropertySearchCriteria) => {
    setBuyerName(name)
    setDescription(desc)
    setCriteria(parsedCriteria)
    setStep('details')
  }

  const handleDetailsComplete = async (data: {
    buyer_name: string
    criteria: PropertySearchCriteria
    template_style: TemplateStyle
    bullet_1: string
    bullet_2: string
    bullet_3: string
    bullet_4: string
  }) => {
    setBuyerName(data.buyer_name)
    setCriteria(data.criteria)
    setStep('pipeline')

    try {
      const payload: CampaignCreateData = {
        buyer_name: data.buyer_name,
        buyer_description: description,
        criteria: data.criteria,
        template_style: data.template_style,
        bullet_1: data.bullet_1,
        bullet_2: data.bullet_2,
        bullet_3: data.bullet_3,
        bullet_4: data.bullet_4 || undefined,
      }

      const res = await apiFetch('/api/mbl/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to create campaign')
      }

      // Campaign created — redirect to it
      const json = await res.json().catch(() => null)
      if (json?.data?.id) {
        router.push(`/campaigns/${json.data.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start campaign')
      setStep('details')
    }
  }

  const handlePipelineComplete = useCallback((id: string, readyCount: number) => {
    setCampaignId(id)
    toast.success(`Found ${readyCount} properties ready for letters!`)
    router.push(`/campaigns/${id}`)
  }, [router])

  const handlePipelineError = useCallback((error: string) => {
    toast.error(error)
  }, [])

  return (
    <div className="py-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(['input', 'details', 'pipeline'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full transition-colors ${
                s === step ? 'bg-[#006AFF]' : i < ['input', 'details', 'pipeline'].indexOf(step) ? 'bg-[#006AFF]/50' : 'bg-muted'
              }`}
            />
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === 'input' && (
        <SmartInput onComplete={handleSmartInputComplete} />
      )}

      {step === 'details' && (
        <BuyerDetails
          initialName={buyerName}
          initialCriteria={criteria}
          onBack={() => setStep('input')}
          onComplete={handleDetailsComplete}
        />
      )}

      {step === 'pipeline' && (
        <PipelineLoading
          campaignId={campaignId}
          eventSource={eventSource}
          onComplete={handlePipelineComplete}
          onError={handlePipelineError}
        />
      )}
    </div>
  )
}
