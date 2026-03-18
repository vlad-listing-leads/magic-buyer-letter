import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { QueryProvider } from '@/components/QueryProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Magic Buyer Letter',
  description: 'Send personalized off-market letters to homeowners',
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
