import { Chip } from '@pluralsh/design-system'
import { formatTokenCost, formatTokenCount } from './workbenchUsage'
import { CaptionP } from '../../utils/typography/Text'
import { useTheme } from 'styled-components'

type UsageChipData = {
  totalCost?: Nullable<number>
  totalTokens?: Nullable<number>
}

export function WorkbenchUsageSummaryChip({
  usage,
  fillLevel = 1,
}: {
  usage?: Nullable<UsageChipData>
  fillLevel?: 1 | 2 | 3
}) {
  const theme = useTheme()
  const cost = formatTokenCost(usage?.totalCost)
  const tokens = formatTokenCount(usage?.totalTokens)

  if (!cost && !tokens) return <>-</>

  return (
    <Chip
      size="small"
      severity="neutral"
      fillLevel={fillLevel}
      css={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: theme.spacing.xxsmall,
      }}
    >
      <CaptionP>{cost}</CaptionP>
      <CaptionP $color="text-long-form">{tokens}</CaptionP>
    </Chip>
  )
}

export function WorkbenchUsageChips({
  usage,
  fillLevel = 2,
}: {
  usage?: Nullable<UsageChipData>
  fillLevel?: 1 | 2 | 3
}) {
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
