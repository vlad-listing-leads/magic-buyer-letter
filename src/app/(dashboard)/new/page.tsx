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
  'generating',    // pipeline: search + verify (fast, no Claude)
  'audience',       // user selects properties
  'preview',        // generates letters for selected only, then shows preview
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
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isGeneratingLetters, setIsGeneratingLetters] = useState(false)

  // Fetch campaign + properties when we have a campaignId and need them
  const needsData = step === 'preview' || step === 'audience' || step === 'review' || step === 'confirmation'
  const { data: campaignData, refetch: refetchCampaign } = useQuery<{
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

  // Fetch skills for name display
  const { data: activeSkills } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['active-skills'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/skills')
      const json = await res.json()
      return json.data ?? []
    },
  })

  const selectedSkillName = activeSkills?.find(s => s.id === selectedSkillId)?.name ?? ''

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
    parsedCriteria: PropertySearchCriteria & { financing?: string; notes?: string }
  ) => {
    setBuyerName(name)
    setDescription(desc)
    setCriteria(parsedCriteria)

    // Pre-fill buyer profile from AI-parsed data
    const validFinancing = ['pre-approved', 'cash', 'fha', 'va', 'conventional']
    if (parsedCriteria.financing && validFinancing.includes(parsedCriteria.financing)) {
      setBuyerProfile((prev) => ({
        ...prev,
        financing: parsedCriteria.financing as BuyerProfileData['financing'],
        additional_notes: parsedCriteria.notes ?? prev.additional_notes,
      }))
    } else if (parsedCriteria.notes) {
      setBuyerProfile((prev) => ({ ...prev, additional_notes: parsedCriteria.notes ?? '' }))
    }

    setStep('profile')
  }

  const handleProfileComplete = async (profile: BuyerProfileData) => {
    setBuyerProfile(profile)
    setStep('generating')

    // Compute bullets fresh from the profile parameter (state hasn't re-rendered yet)
    const freshBullets = generateBullets(profile, {
      min: criteria.price_min,
      max: criteria.price_max,
    })

    try {
      const payload: CampaignCreateData = {
        buyer_name: buyerName || 'My Buyer',
        buyer_description: description,
        criteria,
        template_style: templateStyle,
        bullet_1: freshBullets[0] || 'Serious buyer ready to purchase',
        bullet_2: freshBullets[1] || '',
        bullet_3: freshBullets[2] || '',
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
      toast.success(`Found ${readyCount} properties!`)
      setStep('audience')
    },
    []
  )

  const handlePipelineError = useCallback((error: string) => {
    toast.error(error)
  }, [])

  const handleGenerateLetters = async () => {
    if (!campaignId || selectedIds.size === 0) return
    setIsGeneratingLetters(true)

    try {
      const res = await apiFetch(`/api/mbl/campaigns/${campaignId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_ids: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Generation failed')
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.step === 'error') throw new Error(event.error)
            if (event.step === 'ready') {
              toast.success(`${event.count} letters generated!`)
              await refetchCampaign()
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'ready') throw e
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Letter generation failed')
    } finally {
      setIsGeneratingLetters(false)
    }
  }

  // -- Formatting helpers --

  const area = `${criteria.city ?? ''}${criteria.state ? `, ${criteria.state}` : ''}`
  const priceRange =
    criteria.price_min || criteria.price_max
      ? `${criteria.price_min ? `$${criteria.price_min.toLocaleString()}` : '?'} – ${criteria.price_max ? `$${criteria.price_max.toLocaleString()}` : '?'}`
      : ''

  const currentStepIndex = STEP_ORDER.indexOf(step)

  const STEP_LABELS: Record<WizardStep, string> = {
    input: 'Describe',
    profile: 'Profile',
    generating: 'Generate',
    preview: 'Preview',
    audience: 'Audience',
    review: 'Review',
    confirmation: 'Done',
  }

  return (
    <div className="py-4">
      {/* Step progress — hide on input (hero) and confirmation */}
      {step !== 'input' && step !== 'confirmation' && (
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEP_ORDER.filter((s) => s !== 'confirmation').map((s, i) => {
            const isActive = s === step
            const isDone = i < currentStepIndex
            return (
              <div key={s} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      isActive ? 'w-8 bg-[#006AFF]' : isDone ? 'w-4 bg-[#006AFF]/40' : 'w-4 bg-muted'
                    )}
                  />
                </div>
                {i < STEP_ORDER.length - 2 && <div className="w-1" />}
              </div>
            )
          })}
        </div>
      )}

      {/* Step 1: Smart Input */}
      {step === 'input' && <SmartInput onComplete={handleSmartInputComplete} />}

      {/* Step 2: Buyer Profile */}
      {step === 'profile' && (
        <BuyerProfile
          buyerName={buyerName}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          onBuyerNameChange={setBuyerName}
          initialProfile={buyerProfile}
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
          onBack={() => setStep('profile')}
        />
      )}

      {/* Step 4: Audience Selection (before letter generation) */}
      {step === 'audience' && (
        <AudienceSelection
          properties={properties}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          area={area}
          priceRange={priceRange}
          onBack={() => setStep('generating')}
          onContinue={() => {
            // Trigger letter generation for selected properties
            setStep('preview')
            handleGenerateLetters()
          }}
        />
      )}

      {/* Step 5: Letter Preview (generates on entry, then shows preview) */}
      {step === 'preview' && isGeneratingLetters && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#006AFF]/20 animate-ping" />
            <div className="relative w-14 h-14 rounded-full bg-[#006AFF]/10 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#006AFF] border-t-transparent" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Generating letters...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              AI is writing {selectedIds.size} personalized letter{selectedIds.size !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {step === 'preview' && !isGeneratingLetters && agent && (
        <LetterPreviewWizard
          agent={agent}
          properties={properties}
          buyerName={buyerName || campaign?.buyer_name || ''}
          bullets={bullets}
          templateStyle={templateStyle}
          onTemplateChange={setTemplateStyle}
          selectedSkillId={selectedSkillId}
          onSkillChange={setSelectedSkillId}
          onBack={() => setStep('audience')}
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
          selectedSkillId={selectedSkillId}
          selectedSkillName={selectedSkillName}
          onBack={() => setStep('preview')}
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
