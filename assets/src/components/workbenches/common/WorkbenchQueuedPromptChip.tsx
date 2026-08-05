import { Chip, ChipProps, ClockIcon, Tooltip } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { QueuedPromptSummary } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs } from 'utils/datetime'

export function WorkbenchQueuedPromptChip({
  count,
  summary,
  fillLevel = 1,
  ...props
}: {
  count?: Nullable<number>
  summary?: Nullable<
    Pick<QueuedPromptSummary, 'readyCount' | 'pendingCount' | 'nextAt'>
  >
} & ChipProps) {
  const theme = useTheme()

  if (!count) return null

  const tooltip = formatQueueChipTooltip(summary)

  const chip = (
    <Chip
      size="small"
      severity="neutral"
      fillLevel={fillLevel}
      icon={<ClockIcon size={12} />}
      iconColor="icon-light"
      css={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .children': {
          whiteSpace: 'nowrap',
          color: theme.colors['text-light'],
        },
      }}
      {...props}
    >
      {count} queued
    </Chip>
  )

  if (!tooltip) return chip

  return (
    <Tooltip
      placement="top"
      label={tooltip}
    >
      <span css={{ display: 'inline-flex' }}>{chip}</span>
    </Tooltip>
  )
}

function formatQueueChipTooltip(
  summary?: Nullable<
    Pick<QueuedPromptSummary, 'readyCount' | 'pendingCount' | 'nextAt'>
  >
) {
  if (!summary) return null

  const readyCount = summary.readyCount ?? 0
  const pendingCount = summary.pendingCount ?? 0
  if (readyCount <= 0 && pendingCount <= 0) return null

  const counts = [
    readyCount > 0 ? `${readyCount} ready` : null,
    pendingCount > 0 ? `${pendingCount} pending` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const nextLine = formatNextRunLine({
    readyCount,
    pendingCount,
    nextAt: summary.nextAt,
  })

  return (
    <TooltipLabelSC>
      <CaptionP $color="text">{counts}</CaptionP>
      {nextLine && <CaptionP $color="text-light">{nextLine}</CaptionP>}
    </TooltipLabelSC>
  )
}

function formatNextRunLine({
  readyCount,
  pendingCount,
  nextAt,
}: {
  readyCount: number
  pendingCount: number
  nextAt?: Nullable<string>
}) {
  if (!nextAt || pendingCount <= 0) {
    return null
  }

  const d = dayjs(nextAt)
  const now = dayjs()
  const mins = Math.max(1, Math.round(d.diff(now, 'minute', true)))

  if (readyCount > 0) {
    if (mins < 60) return `Next runs in ${mins} min`
    const hours = Math.round(mins / 60)
    if (hours < 48) return `Next runs in ${hours} hr`
    return `Next runs ${d.fromNow()}`
  }

  if (d.isSame(now.add(1, 'day'), 'day')) {
    return `Next run tomorrow at ${d.format('h:mmA')}`
  }

  if (mins < 60) return `Next run in ${mins} min`
  if (d.isSame(now, 'year')) return `Next run ${d.format('MMM D, h:mmA')}`
  return `Next run ${d.format('MMM D, YYYY h:mmA')}`
}

const TooltipLabelSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
})
