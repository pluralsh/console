import {
  Chip,
  ChipProps,
  SemanticColorKey,
  Tooltip,
} from '@pluralsh/design-system'
import { TooltipTime } from 'components/utils/TooltipTime'
import { ClustersRowFragment } from 'generated/graphql'
import { useEffect, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { dayjsExtended as dayjs, formatDateTime } from 'utils/datetime'

export function ClusterHealth({
  cluster,
  size = 'large',
}: {
  cluster?: ClustersRowFragment
  size?: ChipProps['size']
}) {
  if (!cluster?.installed) {
    return (
      <Tooltip label="The deploy agent still needs to be installed in this cluster">
        <ClusterTableChipSC
          size={size}
          severity="info"
        >
          Pending
        </ClusterTableChipSC>
      </Tooltip>
    )
  }

  return (
    <ClusterHealthChip
      size={size}
      cluster={cluster}
      pingedAt={cluster?.pingedAt}
    />
  )
}

function ClusterHealthChip({
  cluster,
  pingedAt,
  size = 'large',
}: {
  cluster?: ClustersRowFragment
  pingedAt?: string | null
  size?: ChipProps['size']
}) {
  const [now, setNow] = useState(dayjs())

  useEffect(() => {
    const int = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(int)
  }, [])

  const pinged = pingedAt !== null
  const healthy =
    cluster?.healthy ||
    (pingedAt && now.subtract(10, 'minutes').isBefore(dayjs(pingedAt)))

  return (
    <TooltipTime
      startContent={
        pinged
          ? `Pinged: ${formatDateTime(pingedAt, 'MMM D, h:mm')}`
          : `This cluster was not pinged yet`
      }
      date={pingedAt}
      css={{ width: '100%' }}
    >
      <ClusterTableChipSC
        size={size}
        clickable
        severity={pinged ? (healthy ? 'success' : 'danger') : 'warning'}
      >
        {pinged ? (healthy ? 'Healthy' : 'Unhealthy') : 'Pending'}
      </ClusterTableChipSC>
    </TooltipTime>
  )
}

export function ClusterHealthScoreChip({
  healthScore,
  onClick,
}: {
  healthScore?: Nullable<number>
  onClick?: () => void
}) {
  const { colors } = useTheme()
  const color: SemanticColorKey =
    typeof healthScore !== 'number'
      ? 'text'
      : healthScore > 80
        ? 'text-success'
        : healthScore > 60
          ? 'text-success-light'
          : healthScore > 40
            ? 'text-warning-light'
            : healthScore > 20
              ? 'text-danger-light'
              : 'text-danger'

  return (
    <ClusterTableChipSC
      size="large"
      clickable
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      css={{ '&& *': { color: colors[color] } }}
    >
      {healthScore ?? '-'}
    </ClusterTableChipSC>
  )
}

export const ClusterTableChipSC = styled(Chip)({
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
})
