import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="family-tree-theme">
      <BrowserRouter>
        <App />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
