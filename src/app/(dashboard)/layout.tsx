'use client'

import { useRouter } from 'next/navigation'
import { AppRail } from '@/components/app-rail'
import { NavTabs } from '@/components/nav-tabs'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExternalLink, LogOut, Settings, Lock, ChevronDown } from 'lucide-react'
import { Toaster as SileoToaster } from 'sileo'
import 'sileo/styles.css'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from '@/hooks/useApiFetch'
import Image from 'next/image'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { setTheme } = useTheme()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const apiFetch = useApiFetch()
  const isAdmin = user?.isAdmin ?? false

  // Fetch LL profile for headshot + name + theme
  const { data: llProfile } = useQuery<{
    headshot: string | null
    firstName: string | null
    themePreference: string | null
  }>({
    queryKey: ['ll-profile-header'],
    queryFn: async () => {
      const res = await apiFetch('/api/user/ll-profile')
      if (!res.ok) return { headshot: null, firstName: null, themePreference: null }
      const json = await res.json()
      return {
        headshot: json.data?.fields?.headshot ?? null,
        firstName: json.data?.firstName ?? null,
        themePreference: json.data?.themePreference ?? null,
      }
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: 'always',
    enabled: !!user,
  })

  // Sync theme from LL profile
  useEffect(() => {
    if (llProfile?.themePreference) {
      setTheme(llProfile.themePreference)
    }
  }, [llProfile?.themePreference, setTheme])

  const displayName =
    llProfile?.firstName ??
    user?.name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'User'
  const headshot = llProfile?.headshot ?? null

  // Fetch allowed plan IDs for gate (skip for admins)
  const { data: allowedPlanIds } = useQuery<string[]>({
    queryKey: ['allowed-plans'],
    queryFn: async () => {
      const res = await fetch('/api/allowed-plans')
      const json = await res.json()
      return json.data ?? []
    },
    staleTime: 5 * 60_000,
    enabled: !!user && !isAdmin,
  })

  const planCheckLoading = allowedPlanIds === undefined
  const hasAllowedPlan = isAdmin ||
    planCheckLoading || // Still loading — don't gate yet
    allowedPlanIds.length === 0 || // No plans configured = open access
    user?.activePlanIds?.some((id) => allowedPlanIds.includes(id)) === true

  return (
    <div className="flex h-screen overflow-hidden">
      {/* App Rail — left side */}
      <AppRail />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Global Header with inline nav tabs */}
        <header className="h-14 flex items-center px-4 sm:px-6 flex-shrink-0 gap-4 bg-background border-b border-border">
          <NavTabs />
          <div className="flex-1" />

          {/* Plan Badge */}
          {user?.planName && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              {user.planName}
            </span>
          )}

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-foreground hover:bg-accent cursor-pointer">
                  {headshot ? (
                    <Image
                      src={headshot}
                      alt={displayName}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium">{displayName}</span>
                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => window.open('https://www.listingleads.com/profile', '_blank')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                  <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            {user && !hasAllowedPlan ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="max-w-md text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Lock className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold">Upgrade to Access Magic Buyer Letter</h2>
                  <p className="text-sm text-muted-foreground">
                    Your current Listing Leads plan doesn&apos;t include access to Magic Buyer Letter.
                    Upgrade your plan to unlock property search, AI-powered letters, and multi-channel outreach.
                  </p>
                  <a
                    href="https://www.listingleads.com/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                  >
                    View Plans
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : children}
          </div>
        </div>
      </div>
      <SileoToaster position="bottom-left" theme="light" />
    </div>
  )
}
