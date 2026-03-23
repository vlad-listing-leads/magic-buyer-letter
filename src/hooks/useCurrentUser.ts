'use client'

import { useQuery } from '@tanstack/react-query'

interface CurrentUser {
  id: string
  email: string
  name: string
  memberstackId: string
  role: string
  isAdmin: boolean
  activePlanIds: string[]
  isTeamMember: boolean
  planName: string | null
}

async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

/**
 * Hook to get the current authenticated user.
 * Uses TanStack Query for caching and automatic refetching.
 */
export function useCurrentUser() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60_000, // 5 minutes
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin ?? false,
    error,
  }
}
