import { Chip, ChipProps, ChipSeverity, Tooltip } from '@pluralsh/design-system'
import { TooltipTime } from 'components/utils/TooltipTime'
import { ClustersRowFragment } from 'generated/graphql'
import { useEffect, useState } from 'react'
import { dayjsExtended as dayjs, formatDateTime } from 'utils/datetime'

export function ClusterHealth({
  cluster,
  size = 'small',
}: {
  cluster?: ClustersRowFragment
  size?: ChipProps['size']
}) {
  if (!cluster?.installed) {
    return (
      <Tooltip label="The deploy agent still needs to be installed in this cluster">
        <Chip
          size={size}
          severity="info"
          css={{ alignSelf: 'center' }}
        >
          Pending
        </Chip>
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
  size,
  cluster,
  pingedAt,
}: {
  cluster?: ClustersRowFragment
  pingedAt?: string | null
  size: ChipProps['size']
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
      css={{ alignSelf: 'center' }}
    >
      <Chip
        size={size}
        clickable
        severity={pinged ? (healthy ? 'success' : 'danger') : 'warning'}
      >
        {pinged ? (healthy ? 'Healthy' : 'Unhealthy') : 'Pending'}
      </Chip>
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
  const severity: ChipSeverity = healthScoreToSeverity(healthScore)

  return (
    <Chip
      clickable
      css={{ alignSelf: 'center' }}
      size="small"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      severity={severity}
    >
      {healthScore ?? '-'}
    </Chip>
  )
}

export const healthScoreToSeverity = (healthScore?: Nullable<number>) =>
  typeof healthScore !== 'number'
    ? 'neutral'
    : healthScore > 80
      ? 'successDark'
      : healthScore > 60
        ? 'success'
        : healthScore > 40
          ? 'warning'
          : healthScore > 20
            ? 'danger'
            : 'critical'
