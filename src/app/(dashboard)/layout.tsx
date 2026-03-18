'use client'

import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/Navigation'
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
import { ExternalLink, LogOut, Moon, Sun, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const displayName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'User'

  return (
    <div className="flex flex-col h-screen">
      <SidebarProvider className="flex-1 !min-h-0 h-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col bg-sidebar border-l border-border">
          {/* Global Header */}
          <header className="h-14 flex items-center px-4 sm:px-6 flex-shrink-0 gap-4 sticky top-0 z-20 bg-background border-b border-border">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />

            {/* Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              title={
                mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-foreground hover:bg-accent cursor-pointer">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{displayName}</span>
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
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Agent Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => window.open('https://www.listingleads.com/settings', '_blank')}
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
          <div className="flex-1 overflow-hidden">
            <div className="w-full h-full bg-background overflow-y-auto">
              <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">{children}</div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
