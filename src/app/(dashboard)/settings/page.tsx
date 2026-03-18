'use client'

import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { useApiFetch } from '@/hooks/useApiFetch'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import {
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Building2,
  BadgeCheck,
  MapPin,
  FileText,
  Briefcase,
  Target,
  Quote,
  Palette,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
} from 'lucide-react'

interface LLProfile {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  region: string | null
  role: string
  fields: Record<string, string>
}

function ProfileField({
  icon: Icon,
  label,
  value,
  isLink,
  isColor,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  isLink?: boolean
  isColor?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
          {label}
        </p>
        {value ? (
          <div className="flex items-center gap-2 mt-0.5">
            {isColor && (
              <div
                className="h-4 w-4 rounded border border-border/50"
                style={{ backgroundColor: value }}
              />
            )}
            {isLink ? (
              <a
                href={value.startsWith('http') ? value : `https://${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {value.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : (
              <p className="text-sm font-medium truncate">{value}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Not set</p>
        )}
      </div>
    </div>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15a6.34 6.34 0 0 0 6.33 6.33 6.34 6.34 0 0 0 6.34-6.33V8.75a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.18z" />
    </svg>
  )
}

export default function SettingsPage() {
  const apiFetch = useApiFetch()

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<LLProfile>({
    queryKey: ['ll-profile'],
    queryFn: async () => {
      const res = await apiFetch('/api/user/ll-profile')
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Failed to load profile (${res.status})`)
      }
      const result = await res.json()
      return result.data
    },
  })

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : ''

  const f = profile?.fields ?? {}

  const hasSocialLinks = f.website || f.instagram || f.facebook || f.linkedin || f.youtube || f.tiktok

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Profile"
        description="Your profile information from Listing Leads"
        action={
          <Button
            className="gap-2"
            onClick={() => window.open('https://www.listingleads.com/profile', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Edit on Listing Leads
          </Button>
        }
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4 animate-fade-in">
          <div className="h-48 rounded-xl bg-muted/40 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.open('https://www.listingleads.com/profile', '_blank')}
            >
              Go to Listing Leads
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile loaded */}
      {profile && (
        <div className="space-y-4">
          {/* Hero card: avatar + name + tagline */}
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row items-center gap-5 px-6 py-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {f.headshot ? (
                    <Image
                      src={f.headshot}
                      alt={displayName}
                      width={88}
                      height={88}
                      className="rounded-full object-cover ring-2 ring-border/50"
                      style={{ width: 88, height: 88 }}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold ring-2 ring-border/50">
                      {(profile.firstName?.[0] ?? profile.email[0] ?? 'U').toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name + tagline */}
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h2 className="text-xl font-semibold truncate">{displayName}</h2>
                  {f.tagline && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {f.tagline}
                    </p>
                  )}
                  {f.brokerage && (
                    <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{f.brokerage}</span>
                    </div>
                  )}
                  {f.specialty && (
                    <div className="flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{f.specialty}</span>
                    </div>
                  )}
                </div>

                {/* Logo */}
                {f.logo && (
                  <div className="shrink-0 hidden sm:block">
                    <Image
                      src={f.logo}
                      alt="Brokerage logo"
                      width={80}
                      height={48}
                      className="object-contain opacity-70"
                      style={{ maxWidth: 80, maxHeight: 48 }}
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Short bio */}
          {f.bio && (
            <Card>
              <CardContent className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <Quote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
                      About
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {f.bio}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column detail grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardContent className="px-5 py-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
                  Contact Information
                </h3>
                <div className="divide-y divide-border/50">
                  <ProfileField icon={Mail} label="Email" value={profile.email} />
                  <ProfileField icon={Phone} label="Phone" value={f.phone} />
                  <ProfileField icon={MapPin} label="Office Address" value={f.address} />
                  <ProfileField icon={MapPin} label="Region" value={profile.region?.toUpperCase()} />
                </div>
              </CardContent>
            </Card>

            {/* Business Details */}
            <Card>
              <CardContent className="px-5 py-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
                  Business Details
                </h3>
                <div className="divide-y divide-border/50">
                  <ProfileField icon={Building2} label="Brokerage" value={f.brokerage} />
                  <ProfileField icon={FileText} label="License Number" value={f.license_number} />
                  <ProfileField icon={Briefcase} label="Specialty / Niche" value={f.specialty} />
                  <ProfileField icon={MapPin} label="Service Areas" value={f.service_areas} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branding */}
          <Card>
            <CardContent className="px-5 py-4">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
                Branding
              </h3>
              <div className="grid gap-0 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
                <div className="pr-4">
                  <ProfileField icon={Palette} label="Brand Color" value={f.brand_color} isColor />
                </div>
                <div className="px-4">
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                      <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                        Headshot
                      </p>
                      {f.headshot ? (
                        <Image
                          src={f.headshot}
                          alt="Headshot"
                          width={48}
                          height={48}
                          className="mt-1.5 rounded-lg object-cover"
                          style={{ width: 48, height: 48 }}
                          unoptimized
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Not uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pl-4">
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                        Company Logo
                      </p>
                      {f.logo ? (
                        <Image
                          src={f.logo}
                          alt="Logo"
                          width={80}
                          height={40}
                          className="mt-1.5 object-contain"
                          style={{ maxWidth: 80, maxHeight: 40 }}
                          unoptimized
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground/50 mt-0.5 italic">Not uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social & Web Links */}
          {hasSocialLinks && (
            <Card>
              <CardContent className="px-5 py-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
                  Social & Web Links
                </h3>
                <div className="grid gap-0 sm:grid-cols-2 divide-y sm:divide-y-0">
                  <div className="divide-y divide-border/50 sm:pr-4">
                    <ProfileField icon={Globe} label="Website" value={f.website} isLink />
                    <ProfileField icon={Instagram} label="Instagram" value={f.instagram} isLink />
                    <ProfileField icon={Facebook} label="Facebook" value={f.facebook} isLink />
                  </div>
                  <div className="divide-y divide-border/50 sm:pl-4 sm:border-l sm:border-border/50">
                    <ProfileField icon={Linkedin} label="LinkedIn" value={f.linkedin} isLink />
                    <ProfileField icon={Youtube} label="YouTube" value={f.youtube} isLink />
                    <ProfileField icon={TikTokIcon} label="TikTok" value={f.tiktok} isLink />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit notice */}
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground/60">
            <ExternalLink className="h-3 w-3" />
            <span>
              To update your profile, visit{' '}
              <button
                onClick={() => window.open('https://www.listingleads.com/profile', '_blank')}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                listingleads.com/profile
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
