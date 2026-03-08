'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  const isOnboarding = pathname === '/onboarding'

  useEffect(() => {
    const raw = localStorage.getItem('sigmav_wallet')
    if (!raw && !isOnboarding) {
      router.replace('/onboarding')
    } else if (raw && isOnboarding) {
      try {
        const state = JSON.parse(raw)
        if (state.address) {
          router.replace('/')
          return
        }
      } catch { /* ignore */ }
    }
    setChecked(true)
  }, [isOnboarding, router])

  if (!checked) return null

  if (isOnboarding) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6" style={{ background: '#121212' }}>
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
