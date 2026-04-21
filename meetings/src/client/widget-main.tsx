import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout, WorkspaceProvider } from '@moldable-ai/ui'
import './globals.css'
import { QueryProvider } from './query-provider'
import MeetingsWidget from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <WorkspaceProvider>
        <QueryProvider>
          <WidgetLayout>
            <MeetingsWidget />
          </WidgetLayout>
        </QueryProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
