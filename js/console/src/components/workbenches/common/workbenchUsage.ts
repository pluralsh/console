export const USAGE_RANGE_OPTIONS = ['1D', '1W', '1M'] as const

export type UsageRangeOption = (typeof USAGE_RANGE_OPTIONS)[number]

export type TokenUsageCounts = {
  inputTokens?: Nullable<number>
  outputTokens?: Nullable<number>
  cachedTokens?: Nullable<number>
  reasoningTokens?: Nullable<number>
  totalTokens?: Nullable<number>
}

function asCount(value?: Nullable<number>) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0
}

function clampShare(numerator: number, denominator: number) {
  if (denominator <= 0 || numerator <= 0) return 0
  return Math.min(numerator / denominator, 1)
}

/**
 * Prompt size from raw provider usage.
 *
 * OpenAI-style payloads nest cache reads inside `input_tokens`. Anthropic and
 * Gemini report uncached input separately from `cached_tokens`, so cache reads
 * can be much larger than `input_tokens` and must be added, not divided into it.
 */
export function promptTokenCount(usage?: Nullable<TokenUsageCounts>) {
  const input = asCount(usage?.inputTokens)
  const cached = asCount(usage?.cachedTokens)

  return cached > input ? input + cached : input
}

export function billedTokenCount(usage?: Nullable<TokenUsageCounts>) {
  const reported = asCount(usage?.totalTokens)
  const reconstructed = promptTokenCount(usage) + asCount(usage?.outputTokens)

  return Math.max(reported, reconstructed)
}

export function cachedShareOfPrompt(usage?: Nullable<TokenUsageCounts>) {
  return clampShare(asCount(usage?.cachedTokens), promptTokenCount(usage))
}

export function reasoningShareOfOutput(usage?: Nullable<TokenUsageCounts>) {
  return clampShare(
    asCount(usage?.reasoningTokens),
    asCount(usage?.outputTokens)
  )
}

export function inputShareOfTotal(usage?: Nullable<TokenUsageCounts>) {
  return clampShare(asCount(usage?.inputTokens), billedTokenCount(usage))
}

export function outputShareOfTotal(usage?: Nullable<TokenUsageCounts>) {
  return clampShare(asCount(usage?.outputTokens), billedTokenCount(usage))
}

export function cachedPromptPercentageLabel(
  usage?: Nullable<TokenUsageCounts>
) {
  const share = cachedShareOfPrompt(usage)
  if (share <= 0) return undefined

  return `${Math.round(share * 100)}% of input`
}

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
