export const USAGE_RANGE_OPTIONS = ['1D', '1W', '1M'] as const

export type UsageRangeOption = (typeof USAGE_RANGE_OPTIONS)[number]

const THOUSAND = 1_000
const MILLION = 1_000_000

export function formatTokenCount(value: Nullable<number>) {
  if (value == null) return undefined
  if (value === 0) return '0'

  if (value < MILLION) {
    const thousands = Math.max(1, Math.round(value / THOUSAND))
    if (thousands >= 1000) return '1M'
    return `${thousands}K`
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatTokenCost(value: Nullable<number>) {
  if (value == null || value === 0) return undefined

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function compactDateLabel(value: Nullable<string>) {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.toLocaleString('en-US', { day: 'numeric' })

  return `${month} ${day}`
}
