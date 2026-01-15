import type { Metadata } from 'next'
import { ThemeProvider, WorkspaceProvider, themeScript } from '@moldable-ai/ui'
import { QueryProvider } from '../lib/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Personal note taking app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <WorkspaceProvider>
            <QueryProvider>{children}</QueryProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
