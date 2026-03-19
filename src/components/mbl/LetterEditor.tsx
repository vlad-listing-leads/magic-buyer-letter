'use client'

import { useMemo } from 'react'
import {
  EditorRoot,
  EditorContent,
  type JSONContent,
} from 'novel'
import StarterKit from '@tiptap/starter-kit'
import { Card, CardContent } from '@/components/ui/card'
import type { MblAgent, MblProperty, TemplateStyle } from '@/types'

export interface LetterEditorContent {
  opening: string
  body_1: string
  body_2: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
  body_3: string
  body_4: string
  phone_line: string
  closing: string
  ps: string
}

interface LetterEditorProps {
  agent: MblAgent
  property: MblProperty | null
  buyerName: string
  bullets: { b1: string; b2: string; b3: string }
  templateStyle: TemplateStyle
  editedContent?: Partial<LetterEditorContent>
  onContentChange?: (json: JSONContent) => void
}

function buildLetterJSON(props: {
  opening: string
  body1: string
  body2: string
  bulletIntro: string
  b1: string
  b2: string
  b3: string
  body3: string
  body4: string
  phoneLine: string
  closing: string
}): JSONContent {
  const bulletItems: JSONContent[] = [
    { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: props.b1 }] }] },
  ]
  if (props.b2) {
    bulletItems.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: props.b2 }] }] })
  }
  if (props.b3) {
    bulletItems.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: props.b3 }] }] })
  }

  return {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: props.opening }] },
      { type: 'paragraph', content: [{ type: 'text', text: props.body1 }] },
      { type: 'paragraph', content: [{ type: 'text', text: props.body2 }] },
      { type: 'paragraph', content: [{ type: 'text', text: props.bulletIntro, marks: [{ type: 'bold' }] }] },
      { type: 'bulletList', content: bulletItems },
      { type: 'paragraph', content: [{ type: 'text', text: props.body3 }] },
      { type: 'paragraph', content: [{ type: 'text', text: props.body4 }] },
      { type: 'paragraph', content: [{ type: 'text', text: props.phoneLine }] },
      { type: 'paragraph', content: [{ type: 'text', text: props.closing }] },
    ],
  }
}

export function LetterEditor({
  agent,
  property,
  buyerName,
  bullets,
  editedContent,
  onContentChange,
}: LetterEditorProps) {
  const personalized = property?.personalized_content
  const address = property
    ? `${property.address_line1}, ${property.city}`
    : '123 Main St, Your City'
  const neighborhood = property?.neighborhood || 'the area'
  const phone = agent.phone || '(555) 123-4567'

  const initialJSON = useMemo(() => buildLetterJSON({
    opening: editedContent?.opening
      ?? personalized?.opening
      ?? `Your home at ${address} is one of the only properties that my clients, ${buyerName || 'my buyers'}, would seriously consider buying in ${neighborhood}.`,
    body1: editedContent?.body_1
      ?? "We've looked at everything currently on the market. Nothing has been the right fit.",
    body2: editedContent?.body_2
      ?? "I promised them I'd do everything in my power to help them find a new home. That's why I'm writing to you.",
    bulletIntro: `Here's what's important to know about ${buyerName || 'my buyers'}:`,
    b1: editedContent?.bullet_1 ?? personalized?.bullet_1 ?? bullets.b1 ?? 'Pre-approved and ready to buy',
    b2: editedContent?.bullet_2 ?? personalized?.bullet_2 ?? bullets.b2 ?? 'Flexible on closing timeline',
    b3: editedContent?.bullet_3 ?? personalized?.bullet_3 ?? bullets.b3 ?? 'Love the neighborhood',
    body3: editedContent?.body_3 ?? 'I want to be upfront: there are no guarantees here.',
    body4: editedContent?.body_4 ?? 'But if the right offer could change your plans, a short conversation is probably worth your time.',
    phoneLine: editedContent?.phone_line ?? `My personal cell is ${phone}.`,
    closing: editedContent?.closing ?? personalized?.closing ?? 'Warm regards,',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const initials = agent.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const ps = editedContent?.ps ?? ''

  return (
    <Card className="bg-[#faf9f7] text-[#1a1a1a] overflow-hidden rounded-lg" style={{ aspectRatio: '8.5 / 11', fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Letterhead */}
      <div className="flex justify-center pt-10 pb-4">
        {agent.logo_url ? (
          <img src={agent.logo_url} alt={agent.name} className="h-14 max-w-[220px] object-contain" />
        ) : (
          <div className="h-14 flex items-center text-xl font-bold text-[#2d2d2d] tracking-tight" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {agent.brokerage || agent.name}
          </div>
        )}
      </div>

      <CardContent className="px-12 pb-10 pt-0">
        {/* Editable letter body */}
        <EditorRoot>
          <EditorContent
            initialContent={initialJSON}
            extensions={[StarterKit]}
            immediatelyRender={false}
            onUpdate={({ editor }) => {
              onContentChange?.(editor.getJSON())
            }}
            editorContainerProps={{
              className: 'letter-editor',
            }}
            className="max-w-none focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:font-[Arial,_Helvetica,_sans-serif] [&_.tiptap]:text-[15px] [&_.tiptap_p]:my-[0.8em] [&_.tiptap_p]:[line-height:1.5] [&_.tiptap_ul]:my-[0.8em] [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:list-disc [&_.tiptap_li]:my-[0.3em] [&_.tiptap_li]:[line-height:1.35]"
          />
        </EditorRoot>

        {/* Non-editable signature block */}
        <div className="mt-8 select-none">
          <div className="h-8" />
          <div className="flex items-start gap-3">
            {/* Agent headshot */}
            {agent.headshot_url ? (
              <img src={agent.headshot_url} alt={agent.name} className="w-14 h-14 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded bg-[#e5e2dd] flex items-center justify-center text-[15px] font-bold text-[#555] flex-shrink-0">
                {initials}
              </div>
            )}
            {/* Agent details */}
            <div style={{ lineHeight: '1.4' }}>
              <p className="font-bold text-[15px]">
                {agent.name}
                {agent.license_number && (
                  <span className="font-normal text-[11px] text-[#888] ml-1">({agent.license_number})</span>
                )}
              </p>
              {agent.brokerage && <p className="text-[13px] text-[#444]">{agent.brokerage}</p>}
              <p className="text-[13px] text-[#444]">{phone}</p>
              {agent.email && <p className="text-[13px] text-[#444]">{agent.email}</p>}
            </div>
          </div>
        </div>

        {/* P.S. — only if skill generates one */}
        {ps && (
          <div className="mt-6 select-none" style={{ fontSize: '13px', lineHeight: '1.4', color: '#555' }}>
            <p>
              <strong>p.s.</strong> {ps}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
