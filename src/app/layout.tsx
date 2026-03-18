import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { QueryProvider } from '@/components/QueryProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Listing Leads - The Marketing Plan That Will Get You More Listings',
  description:
    'Emails, texts, mailers, social posts, and video scripts – written for you every week by professional marketers. Join 46,000+ agents. Just hit send.',
  icons: {
    icon: '/favicons/favicon-prod.png',
    shortcut: '/favicons/favicon-prod.png',
    apple: '/favicons/favicon-prod.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </QueryProvider>
          <Toaster position="bottom-right" theme="dark" />
        </ThemeProvider>
      </body>
    </html>
  )
}
