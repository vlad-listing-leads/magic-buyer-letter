'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AdaptiveLogoProps {
  src: string
  alt: string
  className?: string
}

/**
 * Logo that adapts sizing based on aspect ratio.
 * Horizontal logos get wider bounds, vertical logos get taller bounds.
 */
export function AdaptiveLogo({ src, alt, className }: AdaptiveLogoProps) {
  const [isVertical, setIsVertical] = useState(false)

  return (
    <img
      src={src}
      alt={alt}
      onLoad={(e) => {
        const img = e.currentTarget
        setIsVertical(img.naturalHeight > img.naturalWidth)
      }}
      className={cn(
        'object-contain',
        isVertical ? 'max-w-[80px] max-h-[120px]' : 'max-w-[220px] max-h-[60px]',
        className
      )}
    />
  )
}
