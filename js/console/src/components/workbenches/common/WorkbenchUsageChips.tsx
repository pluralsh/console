import { Chip } from '@pluralsh/design-system'
import { formatTokenCost, formatTokenCount } from './workbenchUsage'
import { CaptionP } from '../../utils/typography/Text'
import { useTheme } from 'styled-components'
import type { WorkbenchJobBudget } from 'generated/graphql'

type UsageChipData = {
  totalCost?: Nullable<number>
  totalTokens?: Nullable<number>
}

type BudgetChipData = Pick<WorkbenchJobBudget, 'cost' | 'tokens'>

const BUDGET_EXCEEDED_ERROR_PREFIX = 'Budget exceeded'

export function isBudgetExceededError(error?: Nullable<string>) {
  return !!error?.startsWith(BUDGET_EXCEEDED_ERROR_PREFIX)
}

export function isUsageOverBudget(
  usage?: Nullable<UsageChipData>,
  budget?: Nullable<BudgetChipData>
) {
  if (!usage || !budget) return false

  if (budget.tokens != null && budget.tokens > 0 && usage.totalTokens != null)
    return usage.totalTokens >= budget.tokens

  if (budget.cost != null && budget.cost > 0 && usage.totalCost != null)
    return usage.totalCost >= budget.cost

  return false
}

export function isOverBudget({
  usage,
  budget,
  error,
}: {
  usage?: Nullable<UsageChipData>
  budget?: Nullable<BudgetChipData>
  error?: Nullable<string>
}) {
  return isBudgetExceededError(error) || isUsageOverBudget(usage, budget)
}

export function overBudgetTooltip(
  budget?: Nullable<BudgetChipData>
): string | undefined {
  if (budget?.tokens != null && budget.tokens > 0) {
    const limit = formatTokenCount(budget.tokens) ?? String(budget.tokens)
    return `Limit is set at ${limit} tokens. Re-try with more tokens.`
  }

  if (budget?.cost != null && budget.cost > 0) {
    const limit = formatTokenCost(budget.cost) ?? `$${budget.cost}`
    return `Limit is set at ${limit}. Re-try with a higher dollar limit.`
  }
}

function OverLimitChip({
  budget,
  fillLevel = 1,
}: {
  budget?: Nullable<BudgetChipData>
  fillLevel?: 1 | 2 | 3
}) {
  return (
    <Chip
      size="small"
      severity="warning"
      fillLevel={fillLevel}
      tooltip={overBudgetTooltip(budget)}
      css={{
        backgroundColor: '#7B341E',
        border: '1px solid #9C4221',
        '.children': { color: '#FEEBC8' },
      }}
    >
      Over limit
    </Chip>
  )
}

export function WorkbenchUsageSummaryChip({
  usage,
  budget,
  error,
  fillLevel = 1,
}: {
  usage?: Nullable<UsageChipData>
  budget?: Nullable<BudgetChipData>
  error?: Nullable<string>
  fillLevel?: 1 | 2 | 3
}) {
  const theme = useTheme()
  const overLimit = isOverBudget({ usage, budget, error })

  if (overLimit) {
    return (
      <OverLimitChip
        budget={budget}
        fillLevel={fillLevel}
      />
    )
  }

  const cost = formatTokenCost(usage?.totalCost)
  const tokens = formatTokenCount(usage?.totalTokens)

  if (!cost && !tokens) return <>-</>

  return (
    <Chip
      size="small"
      severity="neutral"
      fillLevel={fillLevel}
      css={{
        maxWidth: '100%',
        minWidth: 0,
        display: 'flex',
        flexWrap: 'nowrap',
        gap: theme.spacing.xxsmall,
        '.children': {
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        },
      }}
    >
      <CaptionP>{cost}</CaptionP>
      <CaptionP $color="text-long-form">{tokens}</CaptionP>
    </Chip>
  )
}

export function WorkbenchUsageChips({
  usage,
  budget,
  error,
  fillLevel = 2,
}: {
  usage?: Nullable<UsageChipData>
  budget?: Nullable<BudgetChipData>
  error?: Nullable<string>
  fillLevel?: 1 | 2 | 3
}) {
  if (isOverBudget({ usage, budget, error })) {
    return (
      <OverLimitChip
        budget={budget}
        fillLevel={fillLevel}
      />
    )
  }

  const cost = formatTokenCost(usage?.totalCost)
  const tokens = formatTokenCount(usage?.totalTokens)

  if (!cost && !tokens) return null

  return (
    <>
      {cost && (
        <Chip
          size="small"
          severity="neutral"
          fillLevel={fillLevel}
        >
          <CaptionP $color="text-input-disabled">Cost</CaptionP> {cost}
        </Chip>
      )}
      {tokens && (
        <Chip
          size="small"
          severity="neutral"
          fillLevel={fillLevel}
        >
          <CaptionP $color="text-input-disabled">Tokens</CaptionP> {tokens}
        </Chip>
      )}
    </>
  )
}
