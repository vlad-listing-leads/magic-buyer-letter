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
  agentName: string
  agentBrokerage: string
  agentPhone: string
  agentWebsite: string
  ps: string
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
      { type: 'horizontalRule' },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: props.agentName, marks: [{ type: 'bold' }] },
          { type: 'text', text: ` · ${props.agentBrokerage}` },
          { type: 'text', text: ` · ${props.agentPhone}` },
          ...(props.agentWebsite ? [{ type: 'text' as const, text: ` · ${props.agentWebsite}` }] : []),
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'p.s. ', marks: [{ type: 'bold' }] },
          { type: 'text', text: props.ps },
        ],
      },
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
    closing: editedContent?.closing ?? personalized?.closing ?? 'I look forward to hearing from you,',
    agentName: agent.name || 'Agent Name',
    agentBrokerage: agent.brokerage || '',
    agentPhone: phone,
    agentWebsite: agent.website || '',
    ps: editedContent?.ps
      ?? `If you'd also like to know what your home is realistically worth in today's market, I'm happy to put together a complimentary home value report — no cost, no obligation. Just text or call me at ${phone}.`,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  return (
    <Card className="bg-[#faf8f5] text-stone-900 overflow-hidden" style={{ aspectRatio: '8.5 / 11' }}>
      {/* Agent logo */}
      <div className="flex justify-center pt-8 pb-2">
        {agent.logo_url ? (
          <img src={agent.logo_url} alt={agent.name} className="h-12 max-w-[200px] object-contain" />
        ) : (
          <div className="h-12 flex items-center text-lg font-bold text-stone-700 tracking-tight">
            {agent.brokerage || agent.name}
          </div>
        )}
      </div>

      <CardContent className="px-8 pb-8 pt-2">
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
            className="prose prose-stone prose-sm max-w-none focus:outline-none [&_.tiptap]:outline-none [&_.tiptap_p]:my-3 [&_.tiptap_p]:[line-height:1.4] [&_.tiptap_ul]:my-3 [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:list-disc [&_.tiptap_li]:my-1 [&_.tiptap_li]:[line-height:1.2] [&_.tiptap_hr]:my-4 [&_.tiptap_hr]:border-stone-300"
          />
        </EditorRoot>
      </CardContent>
    </Card>
  )
}
