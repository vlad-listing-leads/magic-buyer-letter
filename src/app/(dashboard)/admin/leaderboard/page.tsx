'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Trophy, Medal } from 'lucide-react'

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  total_sent: number
  campaign_count: number
  total_spend: number
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />
  return <span className="text-muted-foreground">{rank}</span>
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function LeaderboardPage() {
  const apiFetch = useApiFetch()

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['admin-leaderboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/leaderboard')
      const json = await res.json()
      return json.data ?? []
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Top agents by letters sent
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left font-medium text-muted-foreground w-12">#</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Letters Sent</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Campaigns</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {entries?.map((entry, index) => {
                    const rank = index + 1
                    return (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="p-3 text-center">
                          <RankIcon rank={rank} />
                        </td>
                        <td className="p-3 font-medium">{entry.name || '\u2014'}</td>
                        <td className="p-3 text-muted-foreground">{entry.email}</td>
                        <td className="p-3 text-right font-mono">{entry.total_sent.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono">{entry.campaign_count}</td>
                        <td className="p-3 text-right font-mono">{formatDollars(entry.total_spend)}</td>
                      </tr>
                    )
                  })}
                  {entries?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No letters sent yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
