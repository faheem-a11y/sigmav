'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { MobileNav } from './mobile-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { ready, authenticated } = usePrivy()
  const [checked, setChecked] = useState(false)

  const isOnboarding = pathname === '/onboarding'

  useEffect(() => {
    if (!ready) return

    if (!authenticated && !isOnboarding) {
      router.replace('/onboarding')
    } else if (authenticated && isOnboarding) {
      const prefs = localStorage.getItem('sigmav_prefs')
      if (prefs) {
        try {
          const parsed = JSON.parse(prefs)
          if (parsed.connectedDexes?.length > 0) {
            router.replace('/')
            return
          }
        } catch { /* ignore */ }
      }
    }
    setChecked(true)
  }, [ready, authenticated, isOnboarding, router])

  if (!ready || !checked) return null

  if (isOnboarding) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto main-content"
          style={{ background: '#121212' }}
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
