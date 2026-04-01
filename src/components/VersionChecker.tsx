'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const POLL_INTERVAL = 5 * 60_000 // 5 minutes

export function VersionChecker() {
  const initialId = useRef<string | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch('/api/version')
        const { deployId } = await res.json()

        if (!initialId.current) {
          initialId.current = deployId
          return
        }

        if (deployId !== initialId.current) {
          setUpdateAvailable(true)
        }
      } catch {
        // Silently ignore network errors
      }
    }

    checkVersion()
    const interval = setInterval(checkVersion, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
      <span className="text-sm text-foreground">New version available</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
  )
}
