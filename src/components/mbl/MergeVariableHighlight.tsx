'use client'

import { Fragment } from 'react'

interface MergeVariableHighlightProps {
  text: string
  className?: string
}

/** Renders text with {{merge_variables}} highlighted in amber badges */
export function MergeVariableHighlight({ text, className }: MergeVariableHighlightProps) {
  const parts = text.split(/(\{\{[a-z_]+\}\})/g)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.match(/^\{\{[a-z_]+\}\}$/)) {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/50 dark:border-amber-700/50"
            >
              {part}
            </span>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}
