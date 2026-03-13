'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { usePrivy } from '@privy-io/react-auth'
import { useWallet, truncateAddress } from '@/lib/hooks/use-wallet'

// ─── Constants ────────────────────────────────────────────────────────────────
const SUPPORTED_DEXES = ['HyperLiquid', 'Paradex']
const AVAILABLE_PAIRS = ['GMX / HyperLiquid', 'GMX / Paradex']
const EASE = [0.22, 1, 0.36, 1] as const

const DEX_META: Record<string, { desc: string }> = {
  HyperLiquid: { desc: 'High-frequency perpetual venue' },
  Paradex:     { desc: 'Professional derivatives exchange' },
}

const RATE_POOL = [
  '+0.0234', '-0.0087', '+0.0156', '-0.0312', '+0.0089',
  '-0.0145', '+0.0178', '+0.0045', '-0.0223', '+0.0312',
  '-0.0067', '+0.0198', '-0.0034', '+0.0267', '+0.0112',
]

function rndRate() {
  return RATE_POOL[Math.floor(Math.random() * RATE_POOL.length)] + '%'
}

// ─── Text Scramble ────────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&'

function useTextScramble(target: string, active: boolean, ms = 1600) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!active) { setText(''); return }
    let raf: number
    let frame = 0
    const total = ms / 16
    const tick = () => {
      frame++
      const progress = frame / total
      const result = target.split('').map((ch, i) => {
        if (ch === ' ' || ch === '.') return ch
        if (progress * (target.length + 10) - i > 1) return ch
        return CHARS[Math.floor(Math.random() * CHARS.length)]
      }).join('')
      setText(result)
      if (frame < total + 10) raf = requestAnimationFrame(tick)
      else setText(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, ms])
  return text
}

// ─── Arbitrage Matrix Canvas Background ──────────────────────────────────────
interface BgProps {
  phase: number
  highlightSectorRef: React.MutableRefObject<number>
}

function ArbitrageMatrixBackground({ phase, highlightSectorRef }: BgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef  = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = (canvas.width  = window.innerWidth)
    let H = (canvas.height = window.innerHeight)
    let raf: number

    type Cell = {
      x: number; y: number; val: string
      baseA: number; drift: number; sector: number; flash: number
    }
    let cells: Cell[] = []

    const buildCells = () => {
      cells = []
      const COLS = Math.max(1, Math.floor(W / 96))
      const ROWS = Math.max(1, Math.floor(H / 48))
      for (let c = 0; c < COLS; c++)
        for (let r = 0; r < ROWS; r++)
          cells.push({
            x:      c * 96 + 48 + (Math.random() - 0.5) * 28,
            y:      r * 48 + 24 + (Math.random() - 0.5) * 14,
            val:    rndRate(),
            baseA:  Math.random() * 0.02 + 0.007,
            drift:  0.035 + Math.random() * 0.055,
            sector: Math.floor(c / Math.max(1, COLS / 3)),
            flash:  0,
          })
    }
    buildCells()

    type Tendril = {
      x1: number; y1: number; x2: number; y2: number
      progress: number; speed: number; life: number; maxLife: number
    }
    const tendrils: Tendril[] = []
    let frameN = 0

    const spawnTendril = () => {
      if (cells.length < 2) return
      const a = cells[Math.floor(Math.random() * cells.length)]
      const b = cells[Math.floor(Math.random() * cells.length)]
      const dx = b.x - a.x, dy = b.y - a.y
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d < 70 || d > 340) return
      tendrils.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        progress: 0, speed: 0.005 + Math.random() * 0.006,
        life: 0, maxLife: 140 })
    }

    const onResize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
      buildCells()
    }
    window.addEventListener('resize', onResize)

    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      frameN++

      const ph  = phaseRef.current
      const hs  = highlightSectorRef.current  // sector to highlight (-1 = none)
      const speedMul = ph >= 2 ? 1.9 : 1

      // ── Number grid
      ctx.font      = '9px "JetBrains Mono","Courier New",monospace'
      ctx.textAlign = 'center'

      for (const c of cells) {
        c.y += c.drift * speedMul
        if (c.y > H + 20) { c.y = -12; c.val = rndRate() }
        if (Math.random() < (ph >= 2 ? 0.0018 : 0.0006)) c.val = rndRate()
        if (c.flash > 0) c.flash--

        const isFlash = c.sector === hs
        if (isFlash && c.flash < 50) c.flash = 50

        const extra  = ph >= 1 ? 0.012 : 0
        const boost  = isFlash ? 0.07 : 0
        const alpha  = c.baseA + extra + boost

        ctx.fillStyle = isFlash
          ? `rgba(255,59,59,${alpha})`
          : `rgba(180,140,140,${alpha})`
        ctx.fillText(c.val, c.x, c.y)
      }

      // ── Tendrils
      if (frameN % 100 === 0 && ph >= 1) spawnTendril()

      for (let i = tendrils.length - 1; i >= 0; i--) {
        const t = tendrils[i]
        t.life++
        t.progress = Math.min(1, t.progress + t.speed)
        if (t.life > t.maxLife) { tendrils.splice(i, 1); continue }

        const fadeIn  = Math.min(1, t.life / 22)
        const fadeOut = t.life > t.maxLife - 28 ? (t.maxLife - t.life) / 28 : 1
        const a       = fadeIn * fadeOut * 0.22

        const ex = t.x1 + (t.x2 - t.x1) * t.progress
        const ey = t.y1 + (t.y2 - t.y1) * t.progress

        ctx.beginPath()
        ctx.moveTo(t.x1, t.y1)
        ctx.lineTo(ex, ey)
        ctx.strokeStyle = `rgba(255,59,59,${a})`
        ctx.lineWidth   = 0.5
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,59,59,${a * 3})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    tick()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [highlightSectorRef])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

// ─── Corner Heatmap Pulses ────────────────────────────────────────────────────
function CornerPulses({ phase }: { phase: number }) {
  const base = 0.012 + phase * 0.018
  const corners: Array<React.CSSProperties & { pos: string }> = [
    { top: 0,    left:  0,    pos: 'top left' },
    { top: 0,    right: 0,    pos: 'top right' },
    { bottom: 0, left:  0,    pos: 'bottom left' },
    { bottom: 0, right: 0,    pos: 'bottom right' },
  ]
  return (
    <>
      {corners.map(({ pos, ...style }, i) => (
        <motion.div
          key={i}
          className="fixed w-96 h-96 pointer-events-none"
          style={{
            ...style,
            background: `radial-gradient(circle at ${pos}, rgba(255,59,59,${base}) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            zIndex: 0,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.9 }}
        />
      ))}
    </>
  )
}

// ─── System Diagnostic Intro ──────────────────────────────────────────────────
function SystemDiagnosticIntro({ onComplete }: { onComplete: () => void }) {
  const [l2, setL2] = useState(false)
  const [l3, setL3] = useState(false)
  const [l4, setL4] = useState(false)
  const [done, setDone] = useState(false)

  const t1 = useTextScramble('INITIATING DELTA-NEUTRAL PROTOCOLS...', true,  1700)
  const t2 = useTextScramble('CONNECTING AVALANCHE MAINNET...',        l2,   1200)
  const t3 = useTextScramble('SCANNING FUNDING RATE FEEDS...',         l3,   1000)
  const t4 = useTextScramble('SYSTEM READY.',                          l4,   600)

  useEffect(() => {
    const timers = [
      setTimeout(() => setL2(true),     900),
      setTimeout(() => setL3(true),    1650),
      setTimeout(() => setL4(true),    2200),
      setTimeout(() => setDone(true),  2850),
      setTimeout(onComplete,           3350),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: '#0A0A0A' }}
      exit={{ opacity: 0, scale: 1.015 }}
      transition={{ duration: 0.75, ease: EASE }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,59,59,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,59,59,1) 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <Image
            src="/main-logo.png"
            alt="SigmaV"
            width={68}
            height={68}
            style={{
              filter: 'drop-shadow(0 0 18px rgba(255,59,59,0.65)) drop-shadow(0 0 5px rgba(255,59,59,0.3))',
            }}
          />
        </motion.div>

        {/* Terminal readout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="font-mono text-[11px] leading-[1.9] text-left w-[300px]"
          style={{ color: '#3A3A3A' }}
        >
          <p style={{ color: 'rgba(255,59,59,0.65)' }}>{`> ${t1}`}</p>
          {l2 && <p style={{ color: 'rgba(255,59,59,0.5)' }}>{`> ${t2}`}</p>}
          {l3 && <p style={{ color: 'rgba(255,59,59,0.5)' }}>{`> ${t3}`}</p>}
          {l4 && (
            <p style={{ color: done ? '#22c55e' : 'rgba(255,59,59,0.5)' }}>
              {`> ${t4}`}
              {!done && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.45, repeat: Infinity }}
                >_</motion.span>
              )}
            </p>
          )}
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="w-[280px] h-px relative overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: '#FF3B3B' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3.35, ease: [0.4, 0, 0.2, 1] }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Progress Indicator ───────────────────────────────────────────────────────
function ProgressIndicator({ step }: { step: number }) {
  const nodes = [
    { num: 1, label: 'AUTH' },
    { num: 2, label: 'CONNECT' },
    { num: 3, label: 'ACTIVATE' },
  ]
  return (
    <div className="flex items-center justify-center mb-10">
      {nodes.map((n, i) => (
        <div key={n.num} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              {n.num === step && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: '1px solid rgba(255,59,59,0.4)' }}
                  animate={{ scale: [1, 1.75], opacity: [0.6, 0] }}
                  transition={{ duration: 1.9, repeat: Infinity }}
                />
              )}
              <motion.div
                animate={
                  n.num < step
                    ? {
                        background: '#CC2828',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.5)',
                        borderColor: 'rgba(180,30,30,0.7)',
                      }
                    : n.num === step
                    ? {
                        background: 'rgba(255,59,59,0.08)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,59,59,0.35)',
                        borderColor: 'rgba(255,59,59,0.4)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.025)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        borderColor: 'rgba(255,255,255,0.07)',
                      }
                }
                transition={{ duration: 0.35 }}
                className="w-10 h-10 rounded-full flex items-center justify-center relative z-10"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <AnimatePresence mode="wait">
                  {n.num < step ? (
                    <motion.svg
                      key="chk"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="white"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    <motion.span
                      key="num"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-bold font-mono"
                      style={{ color: n.num === step ? '#FF5050' : '#383838' }}
                    >
                      {String(n.num).padStart(2, '0')}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            <span
              className="text-[9px] font-mono tracking-[0.14em]"
              style={{ color: n.num <= step ? 'rgba(255,59,59,0.65)' : '#2C2C2C' }}
            >
              {n.label}
            </span>
          </div>

          {i < nodes.length - 1 && (
            <div
              className="w-20 h-px mx-3 mb-5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <motion.div
                className="absolute inset-y-0 left-0"
                animate={{ width: n.num < step ? '100%' : '0%' }}
                transition={{ duration: 0.5, ease: EASE }}
                style={{ background: 'linear-gradient(90deg, #CC2828, rgba(204,40,40,0.3))' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Raised Panel (shared card shell) ────────────────────────────────────────
function RaisedPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.42, ease: EASE }}
      className="rounded-2xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #141414 0%, #0D0D0D 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTopColor: 'rgba(255,255,255,0.1)',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.055)',
          'inset 0 -1px 0 rgba(0,0,0,0.45)',
          '0 1px 3px rgba(0,0,0,0.65)',
          '0 24px 56px rgba(0,0,0,0.72)',
          '0 0 0 1px rgba(255,59,59,0.04)',
        ].join(','),
        backdropFilter: 'blur(28px)',
      }}
    >
      {/* Top edge highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.07) 50%, transparent 92%)' }}
      />
      {/* Inner-shadow top carve */}
      <div
        className="absolute top-0 left-0 right-0 h-10 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 100%)' }}
      />
      {children}
    </motion.div>
  )
}

// ─── SigmaV 3D Button ─────────────────────────────────────────────────────────
function SigmaButton({
  onClick, disabled, loading, children,
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [magnet, setMagnet] = useState({ x: 0, y: 0 })
  const [hover, setHover]   = useState(false)
  const [press, setPress]   = useState(false)

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const r  = ref.current.getBoundingClientRect()
    const cx = r.left + r.width  / 2
    const cy = r.top  + r.height / 2
    setMagnet({ x: (e.clientX - cx) / r.width * 5, y: (e.clientY - cy) / r.height * 2.5 })
  }

  const isOff = disabled || loading

  return (
    <motion.button
      ref={ref}
      onClick={isOff ? undefined : onClick}
      disabled={isOff}
      animate={{
        x: hover && !isOff ? magnet.x : 0,
        y: hover && !isOff ? magnet.y : 0,
        scale: press ? 0.982 : 1,
      }}
      transition={{ type: 'spring', stiffness: 480, damping: 34, mass: 0.5 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMagnet({ x: 0, y: 0 }) }}
      onMouseMove={onMove}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      onTouchStart={() => setPress(true)}
      onTouchEnd={() => setPress(false)}
      className="w-full py-4 rounded-xl text-[13px] font-semibold antialiased relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        color: '#fff',
        letterSpacing: '0.015em',
        background: isOff
          ? 'rgba(180,40,40,0.3)'
          : press
          ? 'linear-gradient(180deg, #B82020 0%, #9E1818 100%)'
          : hover
          ? 'linear-gradient(180deg, #FF5050 0%, #D43030 100%)'
          : 'linear-gradient(180deg, #E03535 0%, #C42424 100%)',
        border: hover && !isOff
          ? '1px solid rgba(255,120,120,0.45)'
          : '1px solid rgba(150,25,25,0.75)',
        boxShadow: isOff
          ? 'none'
          : press
          ? 'inset 0 2px 5px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)'
          : hover
          ? 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,100,100,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.22), 0 4px 18px rgba(0,0,0,0.5)',
        transition: 'background 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease',
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2.5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 rounded-full"
            style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}
          />
          {children}
        </span>
      ) : children}
    </motion.button>
  )
}

// ─── Machine Dial Ring (Step 1 icon) ─────────────────────────────────────────
function MachineDialRing({ playing }: { playing: boolean }) {
  const R    = 44
  const CIRC = 2 * Math.PI * R
  const N    = 24

  return (
    <div className="relative w-36 h-36 mx-auto mb-7">
      <svg className="w-full h-full" viewBox="0 0 120 120" fill="none">
        {/* Tick marks */}
        {Array.from({ length: N }, (_, i) => {
          const ang     = (i / N) * 2 * Math.PI - Math.PI / 2
          const isLong  = i % 6 === 0
          const outerR  = 55
          const innerR  = outerR - (isLong ? 7 : 3.5)
          return (
            <line
              key={i}
              x1={60 + outerR * Math.cos(ang)} y1={60 + outerR * Math.sin(ang)}
              x2={60 + innerR * Math.cos(ang)} y2={60 + innerR * Math.sin(ang)}
              stroke={`rgba(255,59,59,${isLong ? 0.28 : 0.12})`}
              strokeWidth={isLong ? 1.5 : 0.75}
            />
          )
        })}

        {/* Track ring */}
        <circle cx="60" cy="60" r={R} stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />

        {/* Inner carved plate */}
        <circle cx="60" cy="60" r="37" fill="rgba(7,7,7,0.95)" stroke="rgba(255,59,59,0.09)" strokeWidth="1" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.75" />

        {/* Progress arc — starts from 12 o'clock */}
        <motion.circle
          cx="60" cy="60" r={R}
          stroke="#FF3B3B"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={playing ? { strokeDashoffset: 0 } : {}}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
        />

        {/* Secondary inner arc */}
        <motion.circle
          cx="60" cy="60" r={R - 6}
          stroke="rgba(255,59,59,0.18)"
          strokeWidth="0.75"
          strokeLinecap="round"
          strokeDasharray={String(CIRC * 0.88)}
          initial={{ strokeDashoffset: CIRC }}
          animate={playing ? { strokeDashoffset: -CIRC * 0.12 } : {}}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
        />
      </svg>

      {/* Centre icon — not affected by SVG rotation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg
          className="w-8 h-8"
          style={{ color: '#FF5050' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
          animate={playing ? { opacity: [1, 0.45, 1] } : {}}
          transition={{ duration: 1.1, repeat: playing ? Infinity : 0 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </motion.svg>
      </div>
    </div>
  )
}

// ─── Connect Wallet Step ──────────────────────────────────────────────────────
function ConnectWalletStep({ onConnect }: { onConnect: () => void }) {
  const [busy, setBusy] = useState(false)

  const handleClick = () => {
    setBusy(true)
    setTimeout(onConnect, 1550)
  }

  return (
    <RaisedPanel>
      <div className="p-9 text-center">
        <MachineDialRing playing={busy} />

        <h2 className="text-xl font-bold antialiased tracking-tight mb-2" style={{ color: '#DEDEDE' }}>
          Signal Authorization
        </h2>
        <p className="text-[12px] leading-relaxed mb-2" style={{ color: '#4A4A4A', maxWidth: 300, margin: '0 auto 8px' }}>
          Connect your wallet to initialize the delta-neutral arbitrage engine.
        </p>

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px flex-1 max-w-[56px]" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <span className="text-[9px] font-mono tracking-[0.18em] uppercase" style={{ color: '#2E2E2E' }}>
            Simulated · No Real Funds
          </span>
          <div className="h-px flex-1 max-w-[56px]" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>

        <SigmaButton onClick={handleClick} loading={busy}>
          {busy ? 'Authenticating...' : 'Connect Wallet'}
        </SigmaButton>
      </div>
    </RaisedPanel>
  )
}

// ─── DEX Module Card ──────────────────────────────────────────────────────────
function ModuleDexCard({
  name, desc, abbr, connected, alwaysOn, onToggle, index,
}: {
  name: string; desc: string; abbr: string
  connected: boolean; alwaysOn?: boolean
  onToggle?: () => void; index: number
}) {
  const on = connected || alwaysOn

  return (
    <motion.div
      onClick={alwaysOn ? undefined : onToggle}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.065, duration: 0.3, ease: EASE }}
      whileHover={alwaysOn ? {} : { x: 3 }}
      className="w-full p-3.5 mb-2 rounded-xl flex items-center justify-between relative overflow-hidden"
      style={{
        background: on
          ? 'linear-gradient(90deg, rgba(255,59,59,0.065) 0%, rgba(13,13,13,0) 80%)'
          : 'rgba(255,255,255,0.018)',
        border: `1px solid ${on ? 'rgba(255,59,59,0.18)' : 'rgba(255,255,255,0.055)'}`,
        borderLeftColor: on ? 'rgba(255,59,59,0.4)' : 'rgba(255,255,255,0.055)',
        boxShadow: on
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), inset 3px 0 0 rgba(255,59,59,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        cursor: alwaysOn ? 'default' : 'pointer',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Active left stripe */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
        animate={{ opacity: on ? 1 : 0 }}
        style={{ background: '#FF3B3B' }}
        transition={{ duration: 0.2 }}
      />

      <div className="flex items-center gap-3 relative z-10">
        <motion.div
          animate={{
            background: on ? 'rgba(255,59,59,0.15)' : 'rgba(255,255,255,0.045)',
            boxShadow: on
              ? 'inset 0 1px 0 rgba(255,255,255,0.09), 0 2px 5px rgba(0,0,0,0.4)'
              : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
          transition={{ duration: 0.22 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-mono antialiased"
          style={{
            color: on ? '#FF5050' : '#383838',
            border: `1px solid ${on ? 'rgba(255,59,59,0.22)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          {abbr}
        </motion.div>
        <div>
          <p className="text-[13px] font-semibold antialiased leading-tight" style={{ color: '#CCCCCC' }}>{name}</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#404040' }}>{desc}</p>
        </div>
      </div>

      <div className="relative z-10 flex-shrink-0">
        {alwaysOn ? (
          <span
            className="text-[9px] font-mono tracking-[0.14em] uppercase px-2.5 py-1 rounded-md"
            style={{
              background: 'rgba(34,197,94,0.07)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.13)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            Active
          </span>
        ) : (
          <motion.div
            animate={{
              background: connected ? '#B82020' : 'rgba(255,255,255,0.07)',
              boxShadow: connected
                ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)'
                : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              borderColor: connected ? 'rgba(160,25,25,0.6)' : 'rgba(255,255,255,0.08)',
            }}
            transition={{ duration: 0.22 }}
            className="relative flex items-center"
            style={{ border: '1px solid rgba(255,255,255,0.08)', width: 44, height: 24, borderRadius: 12 }}
          >
            <motion.div
              animate={{ x: connected ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 560, damping: 34 }}
              className="absolute inset-y-0 my-auto w-5 h-5 rounded-full"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #D0D0D0 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 4px rgba(0,0,0,0.55)',
              }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Connect DEX Step ─────────────────────────────────────────────────────────
function ConnectDexStep({
  wallet, onNext, onHighlight,
}: {
  wallet: ReturnType<typeof useWallet>
  onNext: () => void
  onHighlight: (sector: number) => void
}) {
  const handleToggle = (dex: string) => {
    wallet.toggleDex(dex)
    const sector = dex === 'HyperLiquid' ? 1 : 2
    onHighlight(sector)
    setTimeout(() => onHighlight(-1), 1600)
  }

  return (
    <RaisedPanel>
      <div className="p-7">
        <div className="text-center mb-5">
          <h2 className="text-xl font-bold antialiased tracking-tight mb-1" style={{ color: '#DEDEDE' }}>
            Connect Liquidity Sources
          </h2>
          <p className="text-[12px]" style={{ color: '#484848' }}>
            Plug DEX modules in for cross-venue rate comparison
          </p>
        </div>

        {/* Rack chassis — inset carved container */}
        <div
          className="rounded-xl p-2.5 mb-4"
          style={{
            background: 'rgba(0,0,0,0.38)',
            boxShadow: 'inset 0 2px 7px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <ModuleDexCard name="GMX v2" desc="Primary anchor — Avalanche Mainnet" abbr="G" connected alwaysOn index={0} />
          {SUPPORTED_DEXES.map((dex, i) => (
            <ModuleDexCard
              key={dex}
              name={dex}
              desc={DEX_META[dex]?.desc ?? 'Perpetual DEX'}
              abbr={dex[0]}
              connected={wallet.connectedDexes.includes(dex)}
              onToggle={() => handleToggle(dex)}
              index={i + 1}
            />
          ))}
        </div>

        {wallet.address && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <motion.div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#22c55e' }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-mono" style={{ color: '#333' }}>
              {truncateAddress(wallet.address)}
            </span>
          </div>
        )}

        <SigmaButton onClick={onNext} disabled={wallet.connectedDexes.length === 0}>
          Continue to Markets
        </SigmaButton>
      </div>
    </RaisedPanel>
  )
}

// ─── Circuit Bridge Pair Card ─────────────────────────────────────────────────
function CircuitPairCard({
  pair, active, enabled, onToggle, index,
}: {
  pair: string; active: boolean; enabled: boolean
  onToggle: () => void; index: number
}) {
  const [left, right] = pair.split(' / ')

  return (
    <motion.div
      onClick={enabled ? onToggle : undefined}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: enabled ? 1 : 0.32, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3, ease: EASE }}
      className="w-full p-4 mb-2 rounded-xl flex items-center justify-between relative overflow-hidden"
      style={{
        background: active
          ? 'linear-gradient(135deg, rgba(255,59,59,0.055) 0%, rgba(13,13,13,0) 65%)'
          : 'rgba(255,255,255,0.018)',
        border: `1px solid ${active ? 'rgba(255,59,59,0.2)' : 'rgba(255,255,255,0.055)'}`,
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 24px rgba(255,59,59,0.05)'
          : 'inset 0 1px 0 rgba(255,255,255,0.028)',
        cursor: enabled ? 'pointer' : 'not-allowed',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Bridge visualization */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Left node */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono antialiased"
          style={{
            background: 'rgba(255,59,59,0.12)',
            color: '#FF5050',
            border: '1px solid rgba(255,59,59,0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {left[0]}
        </div>

        {/* High-voltage path SVG */}
        <svg width="52" height="20" viewBox="0 0 52 20" fill="none" style={{ overflow: 'visible' }}>
          {/* Static dashed track */}
          <line x1="0" y1="10" x2="52" y2="10"
            stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Active flowing signal */}
          {active && (
            <motion.line
              x1="0" y1="10" x2="52" y2="10"
              stroke="#FF3B3B" strokeWidth="1.5"
              strokeDasharray="10 6"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: -48 }}
              transition={{ duration: 0.65, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Terminal nodes */}
          <circle cx="0" cy="10" r="2.5"
            fill={active ? '#FF3B3B' : 'rgba(255,255,255,0.1)'}
            style={active ? { filter: 'drop-shadow(0 0 3px rgba(255,59,59,0.9))' } : undefined}
          />
          <circle cx="52" cy="10" r="2.5"
            fill={active ? '#FF3B3B' : 'rgba(255,255,255,0.1)'}
            style={active ? { filter: 'drop-shadow(0 0 3px rgba(255,59,59,0.9))' } : undefined}
          />
        </svg>

        {/* Right node */}
        <motion.div
          animate={{
            background: active ? 'rgba(255,59,59,0.12)' : 'rgba(255,255,255,0.04)',
            color: active ? '#FF5050' : '#383838',
            borderColor: active ? 'rgba(255,59,59,0.18)' : 'rgba(255,255,255,0.07)',
          }}
          transition={{ duration: 0.22 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono antialiased"
          style={{ border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
        >
          {right[0]}
        </motion.div>
      </div>

      {/* Labels */}
      <div className="flex-1 ml-5 text-left">
        <p className="text-[13px] font-semibold antialiased" style={{ color: '#CCCCCC' }}>{pair}</p>
        {enabled ? (
          <span
            className="text-[9px] font-mono tracking-wider mt-0.5 inline-block"
            style={{ color: active ? 'rgba(255,80,80,0.8)' : '#383838' }}
          >
            {active ? 'ACTIVE · CROSS-VENUE ARB' : 'READY'}
          </span>
        ) : (
          <span className="text-[10px] font-mono" style={{ color: '#2A2A2A' }}>
            Connect {right} to unlock
          </span>
        )}
      </div>

      {/* Toggle */}
      <motion.div
        animate={{
          background: active ? '#B82020' : 'rgba(255,255,255,0.07)',
          boxShadow: active
            ? 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)'
            : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          borderColor: active ? 'rgba(150,25,25,0.65)' : 'rgba(255,255,255,0.08)',
        }}
        transition={{ duration: 0.22 }}
        className="relative flex-shrink-0 flex items-center"
        style={{ width: 44, height: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <motion.div
          animate={{ x: active ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 560, damping: 34 }}
          className="absolute inset-y-0 my-auto w-5 h-5 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #D0D0D0 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 4px rgba(0,0,0,0.55)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ─── Activate Pairs Step ──────────────────────────────────────────────────────
function ActivatePairsStep({
  wallet, onFinish,
}: {
  wallet: ReturnType<typeof useWallet>
  onFinish: () => void
}) {
  return (
    <RaisedPanel>
      <div className="p-7">
        <div className="text-center mb-5">
          <h2 className="text-xl font-bold antialiased tracking-tight mb-1" style={{ color: '#DEDEDE' }}>
            Activate Trading Pairs
          </h2>
          <p className="text-[12px]" style={{ color: '#484848' }}>
            Establish high-voltage arbitrage circuits
          </p>
        </div>

        <div
          className="rounded-xl p-2.5 mb-4"
          style={{
            background: 'rgba(0,0,0,0.38)',
            boxShadow: 'inset 0 2px 7px rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {AVAILABLE_PAIRS.map((pair, i) => {
            const dexName = pair.split(' / ')[1]
            return (
              <CircuitPairCard
                key={pair}
                pair={pair}
                active={wallet.activePairs.includes(pair)}
                enabled={wallet.connectedDexes.includes(dexName)}
                onToggle={() => wallet.togglePair(pair)}
                index={i}
              />
            )
          })}
        </div>

        <SigmaButton onClick={onFinish} disabled={wallet.activePairs.length === 0}>
          Launch Dashboard
        </SigmaButton>
      </div>
    </RaisedPanel>
  )
}

// ─── Thin Mobile Progress Bar ─────────────────────────────────────────────────
function MobileProgressBar({ step, total = 3 }: { step: number; total?: number }) {
  const pct = ((step - 1) / (total - 1)) * 100
  return (
    <div
      className="fixed top-0 left-0 right-0 z-20 h-0.5"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <motion.div
        className="h-full"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{
          background: 'linear-gradient(90deg, #CC2828 0%, #FF5050 100%)',
          boxShadow: '0 0 8px rgba(255,59,59,0.6)',
        }}
      />
    </div>
  )
}

// ─── Step Dots ────────────────────────────────────────────────────────────────
function StepDots({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const isActive = n === step
        const isDone = n < step
        return (
          <motion.div
            key={n}
            animate={{
              width: isActive ? 20 : 6,
              background: isActive ? '#FF3B45' : isDone ? '#CC2828' : 'rgba(255,255,255,0.1)',
            }}
            transition={{ duration: 0.3, ease: EASE }}
            className="h-1.5 rounded-full"
          />
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router  = useRouter()
  const wallet  = useWallet()
  const { authenticated } = usePrivy()
  const [step,      setStep]      = useState(1)
  const [showIntro, setShowIntro] = useState(true)
  const [exiting,   setExiting]   = useState(false)
  const [phase,     setPhase]     = useState(0)
  const highlightRef = useRef(-1)

  // When Privy auth completes, advance to step 2
  useEffect(() => {
    if (authenticated && step === 1) {
      setPhase(1)
      setStep(2)
    }
  }, [authenticated, step])

  const handleConnect = useCallback(() => {
    wallet.connectWallet()
  }, [wallet])

  const handleDexNext = useCallback(() => {
    setPhase(2)
    setStep(3)
  }, [])

  const handleFinish = useCallback(() => {
    setExiting(true)
    setTimeout(() => router.push('/'), 820)
  }, [router])

  const handleHighlight = useCallback((sector: number) => {
    highlightRef.current = sector
  }, [])

  const handleReset = useCallback(() => {
    wallet.disconnectWallet()
    setStep(1)
    setPhase(0)
  }, [wallet])

  return (
    <div
      className="min-h-screen relative overflow-hidden antialiased"
      style={{ background: '#0A0A0A' }}
    >
      {/* Layer 0 — canvas matrix */}
      <ArbitrageMatrixBackground phase={phase} highlightSectorRef={highlightRef} />

      {/* Layer 1 — corner heatmap */}
      <CornerPulses phase={phase} />

      {/* Layer 2 — subtle central depth glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 40% at 50% 50%, rgba(255,59,59,0.022) 0%, transparent 70%)',
          zIndex: 1,
        }}
      />

      {/* Intro */}
      <AnimatePresence>
        {showIntro && (
          <SystemDiagnosticIntro key="intro" onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {/* Mobile thin progress bar — hidden during intro/exit */}
      <AnimatePresence>
        {!showIntro && !exiting && (
          <MobileProgressBar key="progress-bar" step={step} />
        )}
      </AnimatePresence>

      {/* Main UI */}
      <AnimatePresence>
        {!showIntro && !exiting && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:p-6"
            style={{
              zIndex: 10,
              paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
              paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="w-full max-w-[420px]">
              {/* Header row — logo + optional reset button */}
              <motion.div
                initial={{ opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, ease: EASE, delay: 0.1 }}
                className="relative text-center mb-8"
              >
                {/* Reset / Disconnect — top-right, only shown once wallet connected */}
                {step > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3, ease: EASE }}
                    onClick={handleReset}
                    className="absolute right-0 top-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl active:scale-95 transition-transform"
                    style={{
                      background: 'rgba(255,59,69,0.07)',
                      border: '1px solid rgba(255,59,69,0.14)',
                      color: 'rgba(255,80,80,0.7)',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                    title="Reset onboarding"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    <span className="hidden sm:inline">Reset</span>
                  </motion.button>
                )}

                <motion.div
                  className="flex justify-center mb-3"
                  animate={{
                    filter: [
                      'drop-shadow(0 0 8px rgba(255,59,59,0.35))',
                      'drop-shadow(0 0 20px rgba(255,59,59,0.65))',
                      'drop-shadow(0 0 8px rgba(255,59,59,0.35))',
                    ],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Image src="/main-logo.png" alt="SigmaV" width={40} height={40} />
                </motion.div>

                <h1
                  className="text-xl sm:text-2xl font-bold antialiased tracking-tight mb-1"
                  style={{ color: '#D8D8D8', letterSpacing: '-0.01em' }}
                >
                  SigmaV
                </h1>
                <p
                  className="text-[9px] font-mono tracking-[0.22em] uppercase"
                  style={{ color: '#303030' }}
                >
                  Funding Rate Arbitrage Engine
                </p>
              </motion.div>

              {/* Progress — desktop stepper (md+) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
                className="hidden sm:block"
              >
                <ProgressIndicator step={step} />
              </motion.div>

              {/* Progress — mobile dots (< sm) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
                className="sm:hidden"
              >
                <StepDots step={step} />
              </motion.div>

              {/* Step panels */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <ConnectWalletStep key="s1" onConnect={handleConnect} />
                )}
                {step === 2 && (
                  <ConnectDexStep
                    key="s2"
                    wallet={wallet}
                    onNext={handleDexNext}
                    onHighlight={handleHighlight}
                  />
                )}
                {step === 3 && (
                  <ActivatePairsStep key="s3" wallet={wallet} onFinish={handleFinish} />
                )}
              </AnimatePresence>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-[9px] font-mono mt-5 tracking-[0.2em] uppercase"
                style={{ color: '#222' }}
              >
                Avalanche · Delta-Neutral · Perpetual Futures
              </motion.p>
            </div>
          </motion.div>
        )}

        {/* Camera zoom exit */}
        {exiting && (
          <motion.div
            key="exit"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.82, ease: [0.4, 0, 1, 1] }}
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 50, background: '#0A0A0A' }}
          >
            <div className="text-center">
              <Image
                src="/main-logo.png"
                alt="SigmaV"
                width={44}
                height={44}
                className="mx-auto mb-4"
                style={{ filter: 'drop-shadow(0 0 18px rgba(255,59,59,0.8))' }}
              />
              <p className="text-[9px] font-mono tracking-[0.2em] uppercase" style={{ color: '#FF3B3B' }}>
                Launching Dashboard...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
