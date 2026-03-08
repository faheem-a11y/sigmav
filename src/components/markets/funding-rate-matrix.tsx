'use client'

import { Card } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useFundingRates, type FundingRateWithComparison } from '@/lib/hooks/use-funding-rates'
import { formatRate, formatAnnualizedRate, rateToColorStyle, formatPercentage } from '@/lib/utils/formatting'

type Row = FundingRateWithComparison & Record<string, unknown>

interface FundingRateMatrixProps {
  onRowClick?: (market: FundingRateWithComparison) => void
}

function venueRate(row: FundingRateWithComparison, venueName: string) {
  const venue = row.venueComparison.venues.find((v) => v.name === venueName)
  if (!venue) return null
  return venue.fundingRate
}

export function FundingRateMatrix({ onRowClick }: FundingRateMatrixProps) {
  const { data: rates, isLoading } = useFundingRates()

  const columns: Column<Row>[] = [
    {
      key: 'tokenSymbol',
      label: 'Token',
      sortable: true,
      render: (row) => (
        <span className="font-bold" style={{ color: '#FFFFFF' }}>{row.tokenSymbol}</span>
      ),
    },
    {
      key: 'fundingRateLong',
      label: 'GMX Long',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono font-semibold" style={{ color: rateToColorStyle(row.fundingRateLong) }}>
          {formatRate(row.fundingRateLong)}
        </span>
      ),
    },
    {
      key: 'fundingRateShort',
      label: 'GMX Short',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono font-semibold" style={{ color: rateToColorStyle(row.fundingRateShort) }}>
          {formatRate(row.fundingRateShort)}
        </span>
      ),
    },
    ...['HyperLiquid', 'Paradex'].map((venue) => ({
      key: venue.toLowerCase(),
      label: venue,
      sortable: true,
      align: 'right' as const,
      render: (row: Row) => {
        const rate = venueRate(row, venue)
        if (rate === null) return <span style={{ color: '#555555' }}>--</span>
        return (
          <span className="font-mono font-semibold" style={{ color: rateToColorStyle(rate) }}>
            {formatRate(rate)}
          </span>
        )
      },
    })),
    {
      key: 'maxSpread',
      label: 'Max Spread',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold" style={{ color: '#FF3B45' }}>
          {formatAnnualizedRate(row.venueComparison.maxSpread)}
        </span>
      ),
    },
    {
      key: 'oiRatio',
      label: 'OI Ratio',
      align: 'right',
      render: (row) => {
        const total = row.openInterestLong + row.openInterestShort
        const pct = total > 0 ? row.openInterestLong / total : 0.5
        return (
          <span className="text-xs" style={{ color: '#828282' }}>
            {formatPercentage(pct, 0)} L
          </span>
        )
      },
    },
  ]

  return (
    <Card title="Funding Rate Matrix" subtitle="Cross-venue comparison">
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={(rates ?? []) as Row[]}
          onRowClick={onRowClick as ((row: Row) => void) | undefined}
          emptyMessage="No funding rate data"
        />
      )}
    </Card>
  )
}
