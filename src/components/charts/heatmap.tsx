'use client'

import { useRef, useState } from 'react'
import { formatRate } from '@/lib/utils/formatting'

interface RateCell {
  time: number
  rate: number
}

interface HeatmapRow {
  tokenSymbol: string
  rates: RateCell[]
}

interface HeatmapProps {
  data: HeatmapRow[]
}

function formatHour(unix: number) {
  const d = new Date(unix * 1000)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function getCellStyle(rate: number): { background: string; boxShadow?: string } {
  if (rate === 0 || Math.abs(rate) < 0.000001)
    return { background: '#1A1A1A' }

  const intensity = Math.min(Math.abs(rate) * 5000, 1)

  if (rate > 0) {
    // Deep forest #0D2E1E → vibrant emerald #00D46A
    const bg = `rgb(${lerp(13, 0, intensity)}, ${lerp(46, 212, intensity)}, ${lerp(30, 106, intensity)})`
    const glowStrength = intensity > 0.6 ? (intensity - 0.6) * 1.4 : 0
    return {
      background: bg,
      boxShadow: glowStrength > 0
        ? `0 0 ${Math.round(3 + glowStrength * 9)}px rgba(0, 212, 106, ${(glowStrength * 0.55).toFixed(2)})`
        : undefined,
    }
  } else {
    // Dark burgundy #2D1416 → brand red #FF3B45
    const bg = `rgb(${lerp(45, 255, intensity)}, ${lerp(20, 59, intensity)}, ${lerp(22, 69, intensity)})`
    const glowStrength = intensity > 0.6 ? (intensity - 0.6) * 1.4 : 0
    return {
      background: bg,
      boxShadow: glowStrength > 0
        ? `0 0 ${Math.round(3 + glowStrength * 9)}px rgba(255, 59, 69, ${(glowStrength * 0.55).toFixed(2)})`
        : undefined,
    }
  }
}

export function Heatmap({ data }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    token: string
    time: number
    rate: number
  } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  if (!data.length) return null

  const columnCount = data[0].rates.length
  const currentColIndex = columnCount - 1
  const labelInterval = Math.max(1, Math.floor(columnCount / 6))

  return (
    <div ref={containerRef} className="relative select-none">

      {/* Time axis headers */}
      <div
        className="mb-2"
        style={{
          display: 'grid',
          gridTemplateColumns: `4.5rem 1fr`,
          gap: '0 6px',
        }}
      >
        {/* Empty spacer for token label column */}
        <div />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: '4px',
            position: 'relative',
          }}
        >
          {data[0].rates.map((cell, i) => (
            <span
              key={i}
              className="text-center truncate block"
              style={{
                color: i === currentColIndex ? 'rgba(255, 59, 69, 0.75)' : '#383838',
                fontSize: '8px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.05em',
                fontWeight: i === currentColIndex ? 700 : 400,
              }}
            >
              {i % labelInterval === 0 || i === currentColIndex
                ? formatHour(cell.time)
                : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Grid rows */}
      <div className="relative flex flex-col" style={{ gap: '4px' }}>
        {data.map((row, rowIdx) => (
          <div
            key={row.tokenSymbol}
            className="flex items-center"
            style={{ gap: '6px' }}
          >
            {/* Token label */}
            <span
              className="shrink-0 truncate text-right"
              style={{
                width: '4.5rem',
                fontSize: '10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 500,
                color: '#505050',
                letterSpacing: '0.06em',
                paddingRight: '6px',
                lineHeight: 1,
              }}
            >
              {row.tokenSymbol}
            </span>

            {/* Cell row */}
            <div
              className="flex-1"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: '4px',
              }}
            >
              {row.rates.map((cell, colIdx) => {
                const { background, boxShadow } = getCellStyle(cell.rate)
                const isHovered =
                  hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx
                const isCurrentCol = colIdx === currentColIndex

                return (
                  <div
                    key={colIdx}
                    className="aspect-square min-h-[12px] cursor-crosshair"
                    style={{
                      backgroundColor: background,
                      borderRadius: '3px',
                      boxShadow: isHovered
                        ? `0 0 0 1px rgba(255,255,255,0.12), ${boxShadow ?? ''}`
                        : boxShadow,
                      transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      position: 'relative',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
                      filter: isHovered ? 'brightness(1.25)' : 'brightness(1)',
                      outline: isCurrentCol
                        ? '1px solid rgba(255, 59, 69, 0.18)'
                        : 'none',
                    }}
                    onMouseEnter={(e) => {
                      setHoveredCell({ row: rowIdx, col: colIdx })
                      const rect = e.currentTarget.getBoundingClientRect()
                      const parent = containerRef.current?.getBoundingClientRect()
                      if (parent) {
                        setTooltip({
                          x: rect.left - parent.left + rect.width / 2,
                          y: rect.top - parent.top - 8,
                          token: row.tokenSymbol,
                          time: cell.time,
                          rate: cell.rate,
                        })
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCell(null)
                      setTooltip(null)
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Current time vertical glow line — right edge of the last column */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '1px',
            height: '100%',
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,59,69,0.55) 30%, rgba(255,59,69,0.55) 70%, transparent 100%)',
            boxShadow: '0 0 6px 1px rgba(255, 59, 69, 0.3)',
            pointerEvents: 'none',
            borderRadius: '1px',
          }}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(10, 10, 10, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow:
              '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.7)',
            borderRadius: '10px',
            padding: '10px 14px',
            minWidth: '110px',
          }}
        >
          <p
            style={{
              color: '#C8C8C8',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              marginBottom: '3px',
            }}
          >
            {tooltip.token}
          </p>
          <p
            style={{
              color: '#3C3C3C',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            {formatHour(tooltip.time)}
          </p>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              color: tooltip.rate >= 0 ? '#00D46A' : '#FF3B45',
              textShadow:
                tooltip.rate >= 0
                  ? '0 0 10px rgba(0,212,106,0.55)'
                  : '0 0 10px rgba(255,59,69,0.55)',
            }}
          >
            {formatRate(tooltip.rate)}
          </p>
        </div>
      )}
    </div>
  )
}
