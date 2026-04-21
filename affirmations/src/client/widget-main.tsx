import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import { QueryProvider } from '@/lib/query-provider'
import './globals.css'
import Widget from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <QueryProvider>
          <WidgetLayout>
            <Widget />
          </WidgetLayout>
        </QueryProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
