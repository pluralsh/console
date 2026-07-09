import { Tooltip } from '@pluralsh/design-system'
import styled from 'styled-components'

const LIVE_BG = '#032117'
const PAUSED_BG = '#171a21'

const StatusDotSC = styled.div<{ $live: boolean }>(({ theme, $live }) => ({
  width: 12,
  height: 12,
  borderRadius: '100px',
  flexShrink: 0,
  backgroundColor: $live
    ? theme.colors['text-success']
    : theme.colors['text-primary-disabled'],
}))

const StreamingStatusSC = styled.button<{ $live: boolean }>(
  ({ theme, $live }) => ({
    ...theme.partials.reset.button,
    ...theme.partials.text.body2Bold,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    minHeight: 32,
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.small}px`,
    borderRadius: theme.borderRadiuses.medium,
    border: theme.borders.input,
    backgroundColor: $live ? LIVE_BG : PAUSED_BG,
    color: $live ? theme.colors.text : theme.colors['text-xlight'],
  })
)

export function LogsStreamingStatus({
  live,
  setLive,
}: {
  live: boolean
  setLive: (live: boolean) => void
}) {
  const button = (
    <StreamingStatusSC
      type="button"
      $live={live}
      onClick={() => setLive(!live)}
    >
      <StatusDotSC $live={live} />
      {live ? 'Live' : 'Paused'}
    </StreamingStatusSC>
  )

  if (live) return button

  return (
    <Tooltip
      label="Turning on live logs clears start and end date filters."
      placement="top"
    >
      {button}
    </Tooltip>
  )
}
