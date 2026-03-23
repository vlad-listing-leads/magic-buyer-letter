'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function UpgradePage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="border-dashed max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-4 mb-4">
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-300" />
          </div>
          <h3 className="text-lg font-semibold">Upgrade to Access Magic Buyer Letter</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-sm">
            You need an active Listing Leads plan to use this tool. Upgrade your plan to start
            sending personalized buyer letters.
          </p>
          <Button
            onClick={() => window.open('https://www.listingleads.com/pricing', '_blank')}
          >
            View Plans
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
