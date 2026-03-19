'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, FileText, Table, CheckCircle } from 'lucide-react'
import { useApiFetch } from '@/hooks/useApiFetch'
import { toast } from 'sonner'
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

  const selectedProperties = properties.filter(p => p.selected)
  const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const handleDownloadLetters = async () => {
    setIsGeneratingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default

      // Create an off-screen container for rendering
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      document.body.appendChild(container)

      const doc = new jsPDF({ unit: 'px', format: 'letter' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      for (let i = 0; i < selectedProperties.length; i++) {
        const prop = selectedProperties[i]
        if (i > 0) doc.addPage()

        const content = selectedSkillId && prop.personalized_content_by_skill?.[selectedSkillId]
          ? prop.personalized_content_by_skill[selectedSkillId]
          : prop.personalized_content as { body: string; ps: string } | null

        const body = (content?.body ?? '').replace(/\n/g, '<br/>')
        const ps = content?.ps ?? ''
        const agentName = agent?.name ?? ''
        const initials = agentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

        // Render HTML letter — matches LetterPreview exactly
        const logoHtml = agent?.logo_url
          ? `<img src="${agent.logo_url}" style="height:56px;max-width:220px;object-fit:contain;" crossorigin="anonymous" />`
          : `<div style="font-size:20px;font-weight:bold;color:#2d2d2d;">${agent?.brokerage || agentName}</div>`

        const headshotHtml = agent?.headshot_url
          ? `<img src="${agent.headshot_url}" style="width:56px;height:56px;border-radius:6px;object-fit:cover;flex-shrink:0;" crossorigin="anonymous" />`
          : `<div style="width:56px;height:56px;border-radius:6px;background:#e5e2dd;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:bold;color:#555;flex-shrink:0;">${initials}</div>`

        container.innerHTML = `
          <div style="width:816px;min-height:1056px;padding:96px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;background:#faf9f7;box-sizing:border-box;">
            <div style="text-align:center;margin-bottom:32px;">
              ${logoHtml}
            </div>
            <div style="margin-bottom:12px;">${body}</div>
            <div style="margin-top:40px;display:flex;align-items:flex-start;gap:12px;">
              ${headshotHtml}
              <div style="line-height:1.4;">
                <div style="font-weight:bold;font-size:15px;">${agentName}${agent?.license_number ? ` <span style="font-weight:normal;font-size:11px;color:#888;">(${agent.license_number})</span>` : ''}</div>
                ${agent?.brokerage ? `<div style="font-size:13px;color:#444;">${agent.brokerage}</div>` : ''}
                <div style="font-size:13px;color:#444;">${agent?.phone ?? ''}</div>
                ${agent?.email ? `<div style="font-size:13px;color:#444;">${agent.email}</div>` : ''}
              </div>
            </div>
            ${ps ? `<div style="margin-top:24px;font-size:13px;line-height:1.4;color:#555;"><strong>p.s.</strong> ${ps}</div>` : ''}
          </div>
        `

        // Wait for images to load before capturing
        const images = container.querySelectorAll('img')
        await Promise.all(Array.from(images).map(img =>
          img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve })
        ))

        const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
          scale: 2,
          backgroundColor: '#faf9f7',
          width: 816,
          windowWidth: 816,
          useCORS: true,
          allowTaint: true,
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const imgW = pageW
        const imgH = (canvas.height / canvas.width) * pageW
        doc.addImage(imgData, 'JPEG', 0, 0, imgW, Math.min(imgH, pageH))
      }

      document.body.removeChild(container)
      doc.save(`${campaign.buyer_name}_letters.pdf`)
      setLettersDownloaded(true)
      toast.success('Letters PDF downloaded')

      if (addressesDownloaded) {
        await markComplete()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadAddresses = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'in', format: 'letter', orientation: 'landscape' })

      const margin = 0.5
      let y = 0.8

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(`${campaign.buyer_name} — Address List`, margin, y)
      y += 0.15
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`${area} · ${selectedProperties.length} properties`, margin, y)
      y += 0.35

      // Table header
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      const cols = [margin, 1.2, 4.5, 6, 7, 8, 9]
      doc.text('#', cols[0], y)
      doc.text('Address', cols[1], y)
      doc.text('City, State ZIP', cols[2], y)
      doc.text('Beds', cols[3], y)
      doc.text('Baths', cols[4], y)
      doc.text('Sqft', cols[5], y)
      doc.text('Value', cols[6], y)
      y += 0.05
      doc.line(margin, y, 10.5, y)
      y += 0.15

      // Table rows
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)

      for (let i = 0; i < selectedProperties.length; i++) {
        const prop = selectedProperties[i]
        if (y > 7.5) { doc.addPage(); y = 0.8 }

        doc.text(String(i + 1), cols[0], y)
        doc.text(prop.address_line1 || '', cols[1], y)
        doc.text(`${prop.city}, ${prop.state} ${prop.zip}`, cols[2], y)
        doc.text(String(prop.bedrooms ?? '—'), cols[3], y)
        doc.text(String(prop.bathrooms ?? '—'), cols[4], y)
        doc.text(prop.sqft ? prop.sqft.toLocaleString() : '—', cols[5], y)
        doc.text(prop.estimated_value ? `$${prop.estimated_value.toLocaleString()}` : '—', cols[6], y)
        y += 0.2
      }

      doc.save(`${campaign.buyer_name}_addresses.pdf`)
      setAddressesDownloaded(true)
      toast.success('Address list PDF downloaded')

      if (lettersDownloaded) {
        await markComplete()
      }
    } catch (err) {
      toast.error('Failed to generate PDF')
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
      // Silent — campaign status update is best-effort
    }
    onComplete()
  }

  const bothDownloaded = lettersDownloaded && addressesDownloaded

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Campaign Summary</h1>
        <p className="text-muted-foreground">
          Download your letters and address list
        </p>
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
          variant={addressesDownloaded ? 'outline' : 'default'}
          className={`w-full h-14 text-base justify-between ${!addressesDownloaded ? 'bg-[#006AFF] hover:bg-[#0058D4] text-white' : ''}`}
          size="lg"
        >
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <div className="text-left">
              <p className="font-semibold">Download Address List</p>
              <p className="text-xs opacity-70">All {selectedProperties.length} recipient addresses as PDF</p>
            </div>
          </div>
          {addressesDownloaded ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
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
