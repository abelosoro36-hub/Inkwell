import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import AuthProvider from './AuthProvider.tsx'

// Two builds come from this one project:
//   npm run dev / npm run build           -> the PUBLIC website (contains no admin code)
//   npm run dev:admin / npm run build:admin -> the ADMIN site (Vite mode "admin")
async function start() {
  const Root =
    import.meta.env.MODE === 'admin'
      ? (await import('./AdminApp.tsx')).default
      : (await import('./App.tsx')).default

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </StrictMode>,
  )
}

void start()