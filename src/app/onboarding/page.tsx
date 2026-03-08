'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet, truncateAddress } from '@/lib/hooks/use-wallet'

const SUPPORTED_DEXES = ['HyperLiquid', 'Paradex']
const AVAILABLE_PAIRS = ['GMX / HyperLiquid', 'GMX / Paradex']

export default function OnboardingPage() {
  const router = useRouter()
  const wallet = useWallet()
  const [step, setStep] = useState(1)

  const handleConnect = () => {
    wallet.connectWallet()
    setStep(2)
  }

  const handleDexNext = () => {
    setStep(3)
  }

  const handleFinish = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#121212' }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, rgba(255,59,69,0.2) 0%, rgba(255,59,69,0.08) 100%)',
            border: '1px solid rgba(255,59,69,0.2)',
            boxShadow: '0 0 24px rgba(255,59,69,0.15)',
          }}>
            <svg className="w-7 h-7" style={{ color: '#FF3B45' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>SigmaV</h1>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>Funding Rate Arbitrage Engine</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={s < step
                  ? { background: '#FF3B45', color: '#FFFFFF', boxShadow: '0 0 12px rgba(255,59,69,0.4)' }
                  : s === step
                  ? { background: 'rgba(255,59,69,0.15)', color: '#FF3B45', border: '1px solid rgba(255,59,69,0.4)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#555555', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div className="w-12 h-0.5 transition-all duration-500" style={{
                  background: s < step ? '#FF3B45' : 'rgba(255,255,255,0.08)',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Connect Wallet */}
        {step === 1 && (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{
              background: 'rgba(255,59,69,0.1)',
              border: '1px solid rgba(255,59,69,0.2)',
            }}>
              <svg className="w-8 h-8" style={{ color: '#FF3B45' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Connect Wallet</h2>
            <p className="text-sm mb-8" style={{ color: '#828282' }}>
              Connect your wallet to start using SigmaV&apos;s funding rate arbitrage engine.
            </p>
            <button onClick={handleConnect} className="btn-primary w-full py-3 text-sm font-semibold rounded-xl">
              Connect Wallet
            </button>
            <p className="text-xs mt-4" style={{ color: '#555555' }}>Simulated positions only — no real funds</p>
          </div>
        )}

        {/* Step 2: Connect DEXes */}
        {step === 2 && (
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-1 text-center" style={{ color: '#FFFFFF' }}>Connect DEXes</h2>
            <p className="text-sm mb-6 text-center" style={{ color: '#828282' }}>
              Select which decentralized exchanges to connect for rate comparison.
            </p>

            <div className="p-4 mb-3 rounded-xl flex items-center justify-between" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,59,69,0.15)', color: '#FF3B45' }}>G</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>GMX v2</p>
                  <p className="text-xs" style={{ color: '#828282' }}>Primary — Avalanche</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)' }}>
                Always On
              </span>
            </div>

            {SUPPORTED_DEXES.map((dex) => {
              const connected = wallet.connectedDexes.includes(dex)
              return (
                <button
                  key={dex}
                  onClick={() => wallet.toggleDex(dex)}
                  className="w-full p-4 mb-3 rounded-xl flex items-center justify-between transition-all duration-200"
                  style={{
                    background: connected ? 'rgba(255,59,69,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${connected ? 'rgba(255,59,69,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{
                      background: connected ? 'rgba(255,59,69,0.15)' : 'rgba(255,255,255,0.05)',
                      color: connected ? '#FF3B45' : '#828282',
                    }}>
                      {dex[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{dex}</p>
                      <p className="text-xs" style={{ color: '#828282' }}>Perpetual DEX</p>
                    </div>
                  </div>
                  <div className="w-10 h-5 rounded-full relative transition-all duration-200" style={{ background: connected ? '#FF3B45' : 'rgba(255,255,255,0.1)' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200" style={{ left: connected ? '22px' : '2px' }} />
                  </div>
                </button>
              )
            })}

            {wallet.address && (
              <p className="text-xs text-center mt-2 mb-4" style={{ color: '#555555' }}>
                Wallet: {truncateAddress(wallet.address)}
              </p>
            )}

            <button
              onClick={handleDexNext}
              disabled={wallet.connectedDexes.length === 0}
              className="btn-primary w-full mt-4 py-3 text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Activate Pairs */}
        {step === 3 && (
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-1 text-center" style={{ color: '#FFFFFF' }}>Activate Pairs</h2>
            <p className="text-sm mb-6 text-center" style={{ color: '#828282' }}>
              Choose which DEX pairs to monitor for funding rate arbitrage.
            </p>

            {AVAILABLE_PAIRS.map((pair) => {
              const dexName = pair.split(' / ')[1]
              const dexConnected = wallet.connectedDexes.includes(dexName)
              const active = wallet.activePairs.includes(pair)

              return (
                <button
                  key={pair}
                  onClick={() => dexConnected && wallet.togglePair(pair)}
                  disabled={!dexConnected}
                  className="w-full p-4 mb-3 rounded-xl flex items-center justify-between transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: active ? 'rgba(255,59,69,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? 'rgba(255,59,69,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(255,59,69,0.15)', color: '#FF3B45' }}>G</div>
                      <span className="text-xs" style={{ color: '#555555' }}>↔</span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
                        background: active ? 'rgba(255,59,69,0.15)' : 'rgba(255,255,255,0.05)',
                        color: active ? '#FF3B45' : '#828282',
                      }}>
                        {dexName[0]}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{pair}</p>
                      <p className="text-xs" style={{ color: '#828282' }}>
                        {dexConnected ? 'Cross-venue arbitrage' : `Connect ${dexName} first`}
                      </p>
                    </div>
                  </div>
                  <div className="w-10 h-5 rounded-full relative transition-all duration-200" style={{ background: active ? '#FF3B45' : 'rgba(255,255,255,0.1)' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200" style={{ left: active ? '22px' : '2px' }} />
                  </div>
                </button>
              )
            })}

            <button
              onClick={handleFinish}
              disabled={wallet.activePairs.length === 0}
              className="btn-primary w-full mt-4 py-3 text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              Launch Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
