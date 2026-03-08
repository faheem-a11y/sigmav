'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
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
      <div className="text-center py-8 text-sm" style={{ color: '#555555' }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
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
                style={{ color: '#555555' }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp className="w-3 h-3" style={{ color: '#FF3B45' }} />
                      : <ChevronDown className="w-3 h-3" style={{ color: '#FF3B45' }} />
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
  )
}
