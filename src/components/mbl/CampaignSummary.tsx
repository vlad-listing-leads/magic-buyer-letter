'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText, Table, CheckCircle } from 'lucide-react'
import { useApiFetch } from '@/hooks/useApiFetch'
import { sileo } from 'sileo'
import type { MblCampaign, MblProperty, MblAgent } from '@/types'

interface CampaignSummaryProps {
  campaign: MblCampaign
  properties: MblProperty[]
  agent: MblAgent | null
  selectedSkillId: string | null
  onBack: () => void
  onComplete: () => void
}

export function CampaignSummary({
  campaign,
  properties,
  agent,
  selectedSkillId,
  onBack,
  onComplete,
}: CampaignSummaryProps) {
  const apiFetch = useApiFetch()
  const [lettersDownloaded, setLettersDownloaded] = useState(false)
  const [addressesDownloaded, setAddressesDownloaded] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isGeneratingAddresses, setIsGeneratingAddresses] = useState(false)

  const selectedProperties = properties.filter(p => p.selected)
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

  /** Convert SVG URL to PNG data URI via canvas */
  const svgToPngDataUri = async (svgUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth * 2 || 400
        canvas.height = img.naturalHeight * 2 || 100
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = svgUrl
    })
  }

  const handleDownloadLetters = async () => {
    setIsGeneratingPdf(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { LetterDocument } = await import('./LetterPdf')

      // Convert SVG logo to PNG if needed
      let logoDataUri: string | null = null
      if (agent?.logo_url?.endsWith('.svg') || agent?.logo_url?.includes('.svg?')) {
        try {
          logoDataUri = await svgToPngDataUri(agent.logo_url)
        } catch {
          // Fall back to text
        }
      }

      const blob = await pdf(
        LetterDocument({ properties: selectedProperties, agent, selectedSkillId, logoDataUri })
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${campaign.buyer_name}_letters.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setLettersDownloaded(true)
      sileo.success({ title: 'Letters PDF downloaded' })

      if (addressesDownloaded) await markComplete()
    } catch (err) {
      console.error(err)
      sileo.error({ title: 'Failed to generate PDF' })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadAddresses = async () => {
    setIsGeneratingAddresses(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { AddressDocument } = await import('./LetterPdf')

      const blob = await pdf(
        AddressDocument({ properties: selectedProperties, buyerName: campaign.buyer_name, area })
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${campaign.buyer_name}_addresses.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setAddressesDownloaded(true)
      sileo.success({ title: 'Address list PDF downloaded' })

      if (lettersDownloaded) await markComplete()
    } catch (err) {
      console.error(err)
      sileo.error({ title: 'Failed to generate PDF' })
    } finally {
      setIsGeneratingAddresses(false)
    }
  }

  const markComplete = async () => {
    try {
      await apiFetch(`/api/mbl/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })
    } catch {
      // Silent
    }
    onComplete()
  }

  const bothDownloaded = lettersDownloaded && addressesDownloaded

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Campaign Summary</h1>
        <p className="text-muted-foreground">Download your letters and address list</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{selectedProperties.length}</p>
            <p className="text-xs text-muted-foreground">Letters</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{campaign.buyer_name}</p>
            <p className="text-xs text-muted-foreground">Buyer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{area}</p>
            <p className="text-xs text-muted-foreground">Area</p>
          </CardContent>
        </Card>
      </div>

      {/* Download buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleDownloadLetters}
          disabled={isGeneratingPdf}
          variant={lettersDownloaded ? 'outline' : 'default'}
          className={`w-full h-14 text-base justify-between ${!lettersDownloaded ? 'bg-[#006AFF] hover:bg-[#0058D4] text-white' : ''}`}
          size="lg"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <p className="font-semibold">{isGeneratingPdf ? 'Generating PDF...' : 'Download All Letters'}</p>
              <p className="text-xs opacity-70">{selectedProperties.length} personalized letters as PDF</p>
            </div>
          </div>
          {lettersDownloaded ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : isGeneratingPdf ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </Button>

        <Button
          onClick={handleDownloadAddresses}
          disabled={isGeneratingAddresses}
          variant={addressesDownloaded ? 'outline' : 'default'}
          className={`w-full h-14 text-base justify-between ${!addressesDownloaded ? 'bg-[#006AFF] hover:bg-[#0058D4] text-white' : ''}`}
          size="lg"
        >
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <div className="text-left">
              <p className="font-semibold">{isGeneratingAddresses ? 'Generating PDF...' : 'Download Address List'}</p>
              <p className="text-xs opacity-70">All {selectedProperties.length} recipient addresses as PDF</p>
            </div>
          </div>
          {addressesDownloaded ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : isGeneratingAddresses ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Complete */}
      {bothDownloaded && (
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Both files downloaded — campaign marked as complete
          </p>
          <Button
            onClick={onComplete}
            className="bg-[#006AFF] hover:bg-[#0058D4] text-white px-8"
            size="lg"
          >
            Back to Campaigns
          </Button>
        </div>
      )}

      {!bothDownloaded && (
        <div className="flex justify-start">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to preview
          </Button>
        </div>
      )}
    </div>
  )
}
