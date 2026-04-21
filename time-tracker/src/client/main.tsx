import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@moldable-ai/ui'
import { Providers } from '@/components/providers'
import HomePage from './app'
import './globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Providers>
        <HomePage />
      </Providers>
    </ThemeProvider>
  </StrictMode>,
)
