'use client'

import { PrivyProvider as Privy } from '@privy-io/react-auth'
import { avalanche } from 'viem/chains'

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) {
    // Fallback: render children without auth in dev if no app ID
    return <>{children}</>
  }

  return (
    <Privy
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#FF3B3B',
          logo: '/main-logo.png',
        },
        defaultChain: avalanche,
        supportedChains: [avalanche],
        loginMethods: ['wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </Privy>
  )
}
