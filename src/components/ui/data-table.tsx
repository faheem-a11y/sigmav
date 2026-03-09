'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  /** If true, this column is hidden on the mobile card (e.g. action-only columns still render via mobileFooter) */
  mobileHidden?: boolean
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  /** Columns to feature prominently at the top of each mobile card (key names) */
  mobilePrimary?: string[]
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  mobilePrimary = [],
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal
        }
        const aStr = String(aVal ?? '')
        const bStr = String(bVal ?? '')
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    : data

  if (!data.length) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: '#a0a0a0' }}>
        {emptyMessage}
      </div>
    )
  }

  /* Separate "action" columns (no label) from data columns */
  const dataCols = columns.filter((c) => c.label && !c.mobileHidden)
  const actionCols = columns.filter((c) => !c.label || c.mobileHidden)

  /* Sortable columns for the mobile sort bar */
  const sortableCols = columns.filter((c) => c.sortable && c.label)

  return (
    <>
      {/* ── Desktop table (md+) ──────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap select-none',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.sortable && 'cursor-pointer'
                  )}
                  style={{ color: '#a0a0a0' }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ChevronUp className="w-3 h-3" style={{ color: '#FF3B45' }} />
                          : <ChevronDown className="w-3 h-3" style={{ color: '#FF3B45' }} />
                        : <ChevronsUpDown className="w-3 h-3 opacity-20" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr
                key={i}
                className={clsx('transition-colors duration-200', onRowClick && 'cursor-pointer')}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      'px-4 py-3 font-mono whitespace-nowrap',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                    style={{ color: '#FFFFFF', fontSize: '12px' }}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (< md) ──────────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Sort bar */}
        {sortableCols.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-medium shrink-0" style={{ color: '#444' }}>Sort:</span>
            {sortableCols.map((col) => {
              const isActive = sortKey === col.key
              return (
                <button
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                  style={{
                    background: isActive ? 'rgba(255,59,69,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isActive ? 'rgba(255,59,69,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    color: isActive ? '#FF3B45' : '#666',
                  }}
                >
                  {col.label}
                  {isActive && (
                    sortDir === 'asc'
                      ? <ChevronUp className="w-2.5 h-2.5" />
                      : <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Card stack */}
        <div className="space-y-2">
          {sortedData.map((row, i) => {
            /* Primary cols shown at top with larger text */
            const primaryCols = mobilePrimary.length > 0
              ? dataCols.filter((c) => mobilePrimary.includes(c.key))
              : dataCols.slice(0, 2)
            const secondaryCols = dataCols.filter((c) => !primaryCols.includes(c))

            return (
              <div
                key={i}
                className={clsx('mobile-data-card', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row)}
              >
                {/* Primary row */}
                {primaryCols.length > 0 && (
                  <div className="flex items-center justify-between mb-2.5">
                    {primaryCols.map((col) => (
                      <div key={col.key}>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] mb-0.5" style={{ color: '#444' }}>
                          {col.label}
                        </p>
                        <div className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                          {col.render ? col.render(row) : String(row[col.key] ?? '')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Secondary grid */}
                {secondaryCols.length > 0 && (
                  <div
                    className="grid gap-x-4 gap-y-2 pt-2.5"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(secondaryCols.length, 3)}, 1fr)`,
                      borderTop: primaryCols.length > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                    }}
                  >
                    {secondaryCols.map((col) => (
                      <div key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] mb-0.5" style={{ color: '#3a3a3a' }}>
                          {col.label}
                        </p>
                        <div className="text-xs font-mono" style={{ color: '#CCCCCC' }}>
                          {col.render ? col.render(row) : String(row[col.key] ?? '')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action columns */}
                {actionCols.length > 0 && (
                  <div className="flex justify-end gap-2 mt-2.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {actionCols.map((col) => (
                      <div key={col.key}>
                        {col.render ? col.render(row) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
