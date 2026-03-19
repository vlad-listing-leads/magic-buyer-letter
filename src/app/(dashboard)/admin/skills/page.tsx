'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Loader2, Sparkles, ArrowUp, ArrowDown } from 'lucide-react'
import { sileo } from 'sileo'
import type { MblSkill } from '@/types'

interface SkillFormData {
  name: string
  description: string
  prompt_instructions: string
  is_active: boolean
  sort_order: number
}

const EMPTY_FORM: SkillFormData = {
  name: '',
  description: '',
  prompt_instructions: '',
  is_active: true,
  sort_order: 0,
}

export default function AdminSkillsPage() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SkillFormData>(EMPTY_FORM)

  const { data: skills, isLoading } = useQuery<MblSkill[]>({
    queryKey: ['admin-skills'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/skills')
      const json = await res.json()
      return json.data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: SkillFormData & { id?: string }) => {
      const url = data.id ? `/api/admin/skills/${data.id}` : '/api/admin/skills'
      const method = data.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] })
      setSheetOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      sileo.success({ title: editingId ? 'Skill updated' : 'Skill created' })
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await apiFetch(`/api/admin/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] })
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  })

  const swapOrderMutation = useMutation({
    mutationFn: async ({ skillA, skillB }: { skillA: MblSkill; skillB: MblSkill }) => {
      const [resA, resB] = await Promise.all([
        apiFetch(`/api/admin/skills/${skillA.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: skillB.sort_order }),
        }),
        apiFetch(`/api/admin/skills/${skillB.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: skillA.sort_order }),
        }),
      ])
      const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])
      if (!jsonA.success) throw new Error(jsonA.error)
      if (!jsonB.success) throw new Error(jsonB.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] })
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  })

  const handleMoveUp = (index: number) => {
    if (!skills || index === 0) return
    swapOrderMutation.mutate({ skillA: skills[index], skillB: skills[index - 1] })
  }

  const handleMoveDown = (index: number) => {
    if (!skills || index >= skills.length - 1) return
    swapOrderMutation.mutate({ skillA: skills[index], skillB: skills[index + 1] })
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/admin/skills/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-skills'] })
      sileo.success({ title: 'Skill deleted' })
    },
    onError: (err: Error) => sileo.error({ title: err.message }),
  })

  const handleEdit = (skill: MblSkill) => {
    setEditingId(skill.id)
    setForm({
      name: skill.name,
      description: skill.description,
      prompt_instructions: skill.prompt_instructions,
      is_active: skill.is_active,
      sort_order: skill.sort_order,
    })
    setSheetOpen(true)
  }

  const handleCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, sort_order: (skills?.length ?? 0) })
    setSheetOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({ ...form, ...(editingId ? { id: editingId } : {}) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure letter writing styles for Claude AI
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-[#006AFF] hover:bg-[#0058D4] text-white gap-1.5">
          <Plus className="h-4 w-4" />
          New Skill
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {skills?.map((skill, index) => (
            <Card key={skill.id} className={!skill.is_active ? 'opacity-60' : undefined}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Sort arrows */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0 pt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0 || swapOrderMutation.isPending}
                      onClick={() => handleMoveUp(index)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === (skills?.length ?? 0) - 1 || swapOrderMutation.isPending}
                      onClick={() => handleMoveDown(index)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-[#006AFF] flex-shrink-0" />
                      <h3 className="font-semibold">{skill.name}</h3>
                      <Badge variant={skill.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {skill.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground mb-2">{skill.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 line-clamp-2">
                      {skill.prompt_instructions}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Enable/disable toggle */}
                    <button
                      type="button"
                      onClick={() => toggleActiveMutation.mutate({ id: skill.id, is_active: !skill.is_active })}
                      disabled={toggleActiveMutation.isPending}
                      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${skill.is_active ? 'bg-[#006AFF]' : 'bg-muted'}`}
                      title={skill.is_active ? 'Disable skill' : 'Enable skill'}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${skill.is_active ? 'translate-x-4' : ''}`} />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(skill)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 text-destructive hover:bg-accent transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{skill.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This skill will be permanently deleted. Letters already generated with this skill won&apos;t be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(skill.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {skills?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No skills created yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Skill' : 'New Skill'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Warm & Personal"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description for agents"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prompt Instructions</label>
              <p className="text-xs text-muted-foreground">
                These instructions tell Claude how to write the letter. Define the tone, style, and approach.
              </p>
              <textarea
                value={form.prompt_instructions}
                onChange={(e) => setForm((p) => ({ ...p, prompt_instructions: e.target.value }))}
                placeholder="Write in a warm, personal, conversational tone..."
                rows={5}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Active</label>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                className={`w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-[#006AFF]' : 'bg-muted'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${form.is_active ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full bg-[#006AFF] hover:bg-[#0058D4] text-white"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Save Changes' : 'Create Skill'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
