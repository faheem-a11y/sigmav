'use client'

import { PrivyProvider } from './privy-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider>
      {children}
    </PrivyProvider>
  )
}
