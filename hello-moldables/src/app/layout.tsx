import type { Metadata } from 'next'
import Script from 'next/script'
import { ThemeProvider, WorkspaceProvider, themeScript } from '@moldable-ai/ui'
import './globals.css'

export const metadata: Metadata = {
  title: 'Welcome, friend!',
  description:
    'Welcome to Moldable! Learn how to build and modify apps with AI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
