'use client'

import { Suspense, useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { SmartInput } from '@/components/mbl/SmartInput'
import { BuyerProfile } from '@/components/mbl/BuyerProfile'
import { PipelineLoading } from '@/components/mbl/PipelineLoading'
import { LetterPreviewWizard } from '@/components/mbl/LetterPreviewWizard'
import { AudienceSelection } from '@/components/mbl/AudienceSelection'
import { ReviewAndSend } from '@/components/mbl/ReviewAndSend'
import { Confirmation } from '@/components/mbl/Confirmation'
import { generateBullets } from '@/lib/bullets'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  PropertySearchCriteria,
  TemplateStyle,
  CampaignCreateData,
  BuyerProfileData,
  WizardStep,
  MblCampaign,
  MblProperty,
  MblAgent,
} from '@/types'

const STEP_ORDER: WizardStep[] = [
  'input',
  'profile',
  'generating',
  'preview',
  'audience',
  'review',
  'confirmation',
]

export default function NewLetterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#006AFF] border-t-transparent" /></div>}>
      <NewLetterWizard />
    </Suspense>
  )
}

function NewLetterWizard() {
  const searchParams = useSearchParams()
  const apiFetch = useApiFetch()

  // Check for Stripe return
  const urlStep = searchParams.get('step')
  const urlCampaignId = searchParams.get('campaign_id')
  const urlSentCount = searchParams.get('sent')

  const [step, setStep] = useState<WizardStep>(
    urlStep === 'confirmation' && urlCampaignId ? 'confirmation' : 'input'
  )

  // Shared wizard state
  const [buyerName, setBuyerName] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState<PropertySearchCriteria>({})
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfileData>({
    financing: '',
    closing_flexibility: '',
    condition_tolerance: '',
    additional_notes: '',
  })
  const [campaignId, setCampaignId] = useState<string | null>(urlCampaignId)
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('warm')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch campaign + properties when we have a campaignId and need them
  const needsData = step === 'preview' || step === 'audience' || step === 'review' || step === 'confirmation'
  const { data: campaignData } = useQuery<{
    campaign: MblCampaign
    properties: MblProperty[]
  }>({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const res = await apiFetch(`/api/mbl/campaigns/${campaignId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!campaignId && needsData,
  })

  // Fetch agent profile
  const { data: agent } = useQuery<MblAgent | null>({
    queryKey: ['mbl-agent'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/agent')
      const json = await res.json()
      return json.data
    },
  })

  const campaign = campaignData?.campaign ?? null
  const properties = campaignData?.properties ?? []

  // Auto-select all properties when first arriving at audience step
  useEffect(() => {
    if (step === 'audience' && properties.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(properties.map((p) => p.id)))
    }
  }, [step, properties, selectedIds.size])

  // Generate bullet text from profile selections
  const bullets = useMemo(() => {
    const generated = generateBullets(buyerProfile, {
      min: criteria.price_min,
      max: criteria.price_max,
    })
    return {
      b1: generated[0] ?? '',
      b2: generated[1] ?? '',
      b3: generated[2] ?? '',
    }
  }, [buyerProfile, criteria.price_min, criteria.price_max])

  // -- Step handlers --

  const handleSmartInputComplete = (
    name: string,
    desc: string,
    parsedCriteria: PropertySearchCriteria
  ) => {
    setBuyerName(name)
    setDescription(desc)
    setCriteria(parsedCriteria)
    setStep('profile')
  }

  const handleProfileComplete = async (profile: BuyerProfileData) => {
    setBuyerProfile(profile)
    setStep('generating')

    try {
      const payload: CampaignCreateData = {
        buyer_name: buyerName,
        buyer_description: description,
        criteria,
        template_style: templateStyle,
        bullet_1: bullets.b1,
        bullet_2: bullets.b2,
        bullet_3: bullets.b3,
        financing: profile.financing || undefined,
        closing_flexibility: profile.closing_flexibility || undefined,
        condition_tolerance: profile.condition_tolerance || undefined,
        additional_notes: profile.additional_notes || undefined,
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

      const { data: result } = await res.json()
      setCampaignId(result.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start campaign')
      setStep('profile')
    }
  }

  const handlePipelineComplete = useCallback(
    (id: string, readyCount: number) => {
      setCampaignId(id)
      toast.success(`Found ${readyCount} properties ready for letters!`)
      setStep('preview')
    },
    []
  )

  const handlePipelineError = useCallback((error: string) => {
    toast.error(error)
  }, [])

  // -- Formatting helpers --

  const area = `${criteria.city ?? ''}${criteria.state ? `, ${criteria.state}` : ''}`
  const priceRange =
    criteria.price_min || criteria.price_max
      ? `$${criteria.price_min ? Math.round(criteria.price_min / 1000) : '?'}K–$${criteria.price_max ? Math.round(criteria.price_max / 1000) : '?'}K`
      : ''

  const currentStepIndex = STEP_ORDER.indexOf(step)

  return (
    <div className="py-4">
      {/* Step indicators — hide on confirmation */}
      {step !== 'confirmation' && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEP_ORDER.filter((s) => s !== 'confirmation').map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  s === step
                    ? 'bg-[#006AFF]'
                    : i < currentStepIndex
                      ? 'bg-[#006AFF]/50'
                      : 'bg-muted'
                )}
              />
              {i < STEP_ORDER.length - 2 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Smart Input */}
      {step === 'input' && <SmartInput onComplete={handleSmartInputComplete} />}

      {/* Step 2: Buyer Profile */}
      {step === 'profile' && (
        <BuyerProfile
          buyerName={buyerName}
          criteria={criteria}
          onBack={() => setStep('input')}
          onComplete={handleProfileComplete}
        />
      )}

      {/* Step 3: Pipeline Loading */}
      {step === 'generating' && (
        <PipelineLoading
          campaignId={campaignId}
          buyerName={buyerName}
          onComplete={handlePipelineComplete}
          onError={handlePipelineError}
        />
      )}

      {/* Step 4: Letter Preview */}
      {step === 'preview' && agent && (
        <LetterPreviewWizard
          agent={agent}
          properties={properties}
          buyerName={buyerName || campaign?.buyer_name || ''}
          bullets={bullets}
          templateStyle={templateStyle}
          onTemplateChange={setTemplateStyle}
          onBack={() => setStep('generating')}
          onContinue={() => setStep('audience')}
        />
      )}

      {/* Step 5: Audience Selection */}
      {step === 'audience' && (
        <AudienceSelection
          properties={properties}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          area={area}
          priceRange={priceRange}
          onBack={() => setStep('preview')}
          onContinue={() => setStep('review')}
        />
      )}

      {/* Step 6: Review & Send */}
      {step === 'review' && campaign && (
        <ReviewAndSend
          campaign={campaign}
          properties={properties}
          selectedCount={selectedIds.size}
          templateStyle={templateStyle}
          onBack={() => setStep('audience')}
        />
      )}

      {/* Step 7: Confirmation */}
      {step === 'confirmation' && campaignId && (
        <Confirmation
          sentCount={urlSentCount ? parseInt(urlSentCount, 10) : selectedIds.size}
          campaignId={campaignId}
        />
      )}

      {/* Loading state when waiting for data */}
      {(step === 'preview' || step === 'review') && !agent && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#006AFF] border-t-transparent" />
        </div>
      )}
    </div>
  )
}
