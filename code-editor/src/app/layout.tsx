import type { Metadata } from 'next'
import { ThemeProvider, WorkspaceProvider } from '@moldable-ai/ui'
import { QueryProvider } from '@/lib/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Code',
  description:
    'A lightweight, VS Code-like IDE for exploring and editing local codebases with integrated AI context and browser preview.',
}

// Inline script to set theme before render - prevents flash
const themeInitScript = `
(function() {
  try {
    var params = new URLSearchParams(window.location.search);
    var theme = params.get('theme');
    if (!theme) {
      theme = localStorage.getItem('moldable-theme');
    }
    if (theme === 'system' || !theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full overflow-hidden font-sans antialiased">
        <ThemeProvider>
          <WorkspaceProvider>
            <QueryProvider>
              <div className="h-full w-full">{children}</div>
            </QueryProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
