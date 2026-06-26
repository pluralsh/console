export const USAGE_RANGE_OPTIONS = ['1D', '1W', '1M'] as const

export type UsageRangeOption = (typeof USAGE_RANGE_OPTIONS)[number]

export function formatTokenCount(value: Nullable<number>) {
  if (value == null) return undefined

  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  return formatter.format(value)
}

export function formatTokenCost(value: Nullable<number>) {
  if (value == null) return undefined

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
