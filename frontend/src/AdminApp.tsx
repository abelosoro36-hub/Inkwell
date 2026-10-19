import { useEffect } from 'react'
import AdminPanel from './components/admin/AdminPanel'

// The whole admin site. It is built on its own (npm run build:admin) and kept off the public website.
export default function AdminApp() {
  useEffect(() => {
    document.title = 'Inkwell admin'
  }, [])

  return <AdminPanel />
}