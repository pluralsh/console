import { Chip, Tooltip } from '@pluralsh/design-system'
import { TooltipTime } from 'components/utils/TooltipTime'
import { ClustersRowFragment } from 'generated/graphql'
import { useEffect, useState } from 'react'
import { dayjsExtended as dayjs, formatDateTime } from 'utils/datetime'

export function ClusterHealth({
  cluster,
  size = 'medium',
}: {
  cluster?: ClustersRowFragment
  size?: 'small' | 'medium' | 'large'
}) {
  if (!cluster?.installed) {
    return (
      <Tooltip label="The deploy agent still needs to be installed in this cluster">
        <Chip
          severity="info"
          size={size}
        >
          Pending
        </Chip>
      </Tooltip>
    )
  }

  return (
    <ClusterHealthChip
      cluster={cluster}
      pingedAt={cluster.pingedAt}
      size={size}
    />
  )
}

function ClusterHealthChip({
  cluster,
  pingedAt,
  size = 'medium',
}: {
  cluster?: ClustersRowFragment
  pingedAt?: string | null
  size?: 'small' | 'medium' | 'large'
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
    >
      <Chip
        severity={pinged ? (healthy ? 'success' : 'danger') : 'warning'}
        size={size}
        clickable
      >
        {pinged ? (healthy ? 'Healthy' : 'Unhealthy') : 'Pending'}
      </Chip>
    </TooltipTime>
  )
}
