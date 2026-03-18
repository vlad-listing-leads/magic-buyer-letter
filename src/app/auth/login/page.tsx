'use client'

import { useEffect } from 'react'

/**
 * Login page — redirects to Listing Leads SSO.
 * In development with DEV_LOGIN_ENABLED, shows a dev login button.
 */
export default function LoginPage() {
  const llUrl = process.env.NEXT_PUBLIC_LL_URL || 'https://listingleads.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3010'

  useEffect(() => {
    // In production, auto-redirect to LL SSO
    if (process.env.NODE_ENV === 'production') {
      const ssoUrl = `${llUrl}/auth/sso-redirect?returnTo=${encodeURIComponent(appUrl)}`
      window.location.href = ssoUrl
    }
  }, [llUrl, appUrl])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Listing Leads account
          </p>
        </div>

        <div className="space-y-3">
          {/* Production: Auto-redirect to LL SSO */}
          <a
            href={`${llUrl}/auth/sso-redirect?returnTo=${encodeURIComponent(appUrl)}`}
            className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Continue with Listing Leads
          </a>

          {/* Development: Dev login bypass */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    Development only
                  </span>
                </div>
              </div>
              <a
                href="/api/auth/dev-login"
                className="flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Dev Login (bypass SSO)
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
