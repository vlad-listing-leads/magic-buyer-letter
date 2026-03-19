'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PenLine, Mail, Sparkles, Users } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const navItems = [
  { href: '/', label: 'Campaigns', icon: Mail },
  { href: '/new', label: 'New Letter', icon: PenLine },
]

const adminItems = [
  { href: '/admin/skills', label: 'Skills', icon: Sparkles },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const { user } = useCurrentUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-white.svg' : '/logo.svg'
  const collapsedLogoSrc =
    mounted && resolvedTheme === 'dark' ? '/logo-collapsed-dark-mode.svg' : '/logo-collapsed.svg'

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent" render={<a href="https://www.listingleads.com/plan" />}>
              <Image
                key={`logo-${resolvedTheme}`}
                src={logoSrc}
                alt="Listing Leads"
                width={112}
                height={24}
                className="h-6 w-auto group-data-[collapsible=icon]:hidden"
                priority
              />
              <Image
                key={`collapsed-logo-${resolvedTheme}`}
                src={collapsedLogoSrc}
                alt="Listing Leads"
                width={32}
                height={32}
                className="hidden group-data-[collapsible=icon]:block size-8"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-1">
          <SidebarGroupLabel>Magic Buyer Letter</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive} tooltip={item.label} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin section — only for admin/superadmin */}
        {isAdmin && (
          <SidebarGroup className="py-1">
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={isActive} tooltip={item.label} render={<Link href={item.href} />}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
