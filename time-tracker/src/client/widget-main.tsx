import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, WidgetLayout } from '@moldable-ai/ui'
import { Providers } from '@/components/providers'
import './globals.css'
import WidgetPage from './widget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Providers>
        <WidgetLayout>
          <WidgetPage />
        </WidgetLayout>
      </Providers>
    </ThemeProvider>
  </StrictMode>,
)
