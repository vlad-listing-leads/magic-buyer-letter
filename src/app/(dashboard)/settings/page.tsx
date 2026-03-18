'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { MblAgent, AgentSetupData } from '@/types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

export default function SettingsPage() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()

  const { data: agent, isLoading } = useQuery<MblAgent | null>({
    queryKey: ['mbl-agent'],
    queryFn: async () => {
      const res = await apiFetch('/api/mbl/agent')
      const json = await res.json()
      return json.data
    },
  })

  const [form, setForm] = useState<AgentSetupData>({
    name: '',
    brokerage: '',
    phone: '',
    email: '',
    license_number: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
  })

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name,
        brokerage: agent.brokerage,
        phone: agent.phone,
        email: agent.email,
        license_number: agent.license_number,
        website: agent.website,
        address_line1: agent.address_line1,
        address_line2: agent.address_line2,
        city: agent.city,
        state: agent.state,
        zip: agent.zip,
      })
    }
  }, [agent])

  const saveMutation = useMutation({
    mutationFn: async (data: AgentSetupData) => {
      const res = await apiFetch('/api/mbl/agent/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mbl-agent'] })
      toast.success('Agent profile saved')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save profile')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  const updateField = (field: keyof AgentSetupData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agent Profile</h1>
        <p className="text-muted-foreground">
          Your profile appears on every letter you send
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>How homeowners will reach you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brokerage</label>
                <Input
                  value={form.brokerage}
                  onChange={e => updateField('brokerage', e.target.value)}
                  placeholder="Keller Williams Realty"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  value={form.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="jane@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">License #</label>
                <Input
                  value={form.license_number}
                  onChange={e => updateField('license_number', e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={form.website}
                  onChange={e => updateField('website', e.target.value)}
                  placeholder="www.janesmith.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Return Address</CardTitle>
                <CardDescription>Printed on every letter envelope</CardDescription>
              </div>
              {agent && (
                <Badge variant={agent.address_verified ? 'default' : 'secondary'}>
                  {agent.address_verified ? (
                    <><CheckCircle className="mr-1 h-3 w-3" /> Verified</>
                  ) : (
                    <><AlertCircle className="mr-1 h-3 w-3" /> Unverified</>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Address Line 1 *</label>
              <Input
                value={form.address_line1}
                onChange={e => updateField('address_line1', e.target.value)}
                placeholder="123 Main St"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address Line 2</label>
              <Input
                value={form.address_line2}
                onChange={e => updateField('address_line2', e.target.value)}
                placeholder="Suite 100"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">City *</label>
                <Input
                  value={form.city}
                  onChange={e => updateField('city', e.target.value)}
                  placeholder="Boston"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State *</label>
                <select
                  value={form.state}
                  onChange={e => updateField('state', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select</option>
                  {US_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ZIP *</label>
                <Input
                  value={form.zip}
                  onChange={e => updateField('zip', e.target.value)}
                  placeholder="02101"
                  required
                  maxLength={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-[#006AFF] hover:bg-[#0058D4] text-white px-8"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Profile'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
