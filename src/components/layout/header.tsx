'use client'

import { Activity, Clock, Menu, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet, truncateAddress } from '@/lib/hooks/use-wallet'
import { Badge } from '@/components/ui/badge'

export function Header() {
  const [time, setTime] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { address, disconnectWallet } = useWallet()
  const router = useRouter()

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleDisconnect = () => {
    disconnectWallet()
    router.push('/onboarding')
  }

  return (
    <header className="h-14 flex items-center justify-between px-6" style={{
      background: 'rgba(18,18,18,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
    }}>
      <div className="flex items-center gap-4">
        <button
          className="md:hidden transition-colors duration-200"
          style={{ color: '#828282' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Activity className="w-4 h-4" style={{ color: '#22c55e' }} />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: '#828282' }}>GMX v2</span>
          <Badge variant="green" pulse>Live</Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {address && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
            <span className="text-xs font-mono" style={{ color: '#828282' }}>{truncateAddress(address)}</span>
            <button
              onClick={handleDisconnect}
              className="transition-colors duration-200 ml-1 hover:opacity-100 opacity-60"
              style={{ color: '#828282' }}
              title="Disconnect wallet"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <Clock className="w-3.5 h-3.5" style={{ color: '#555555' }} />
          <span className="text-xs font-mono tabular-nums" style={{ color: '#828282' }}>{time} UTC</span>
        </div>
      </div>
    </header>
  )
}
