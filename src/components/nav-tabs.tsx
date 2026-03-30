'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  UserPlus,
  Sparkles,
  Trophy,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface NavTab {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const mainTabs: NavTab[] = [
  { href: '/', label: 'Buyers', icon: Users },
  { href: '/new', label: 'New Buyer', icon: UserPlus },
]

const adminTabs: NavTab[] = [
  { href: '/admin/skills', label: 'Skills', icon: Sparkles },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/admin/plans', label: 'Plans', icon: Shield },
]

function TabItem({ tab, isActive }: { tab: NavTab; isActive: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      href={tab.href}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
        isActive
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </Link>
  )
}

export function NavTabs() {
  const pathname = usePathname()
  const { isAdmin } = useCurrentUser()

  const isAdminSection = pathname.startsWith('/admin')

  const tabs = isAdminSection && isAdmin ? adminTabs : mainTabs

  const isTabActive = (tab: NavTab) => {
    if (tab.href === '/') return pathname === '/'
    return pathname === tab.href || pathname.startsWith(tab.href)
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => (
        <TabItem key={tab.href} tab={tab} isActive={isTabActive(tab)} />
      ))}
    </div>
  )
}
