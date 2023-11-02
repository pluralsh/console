import { useEffect, useState } from 'react'
import moment from 'moment'
import { Chip, Tooltip } from '@pluralsh/design-system'
import { ClustersRowFragment } from 'generated/graphql'

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
      pingedAt={cluster.pingedAt}
      size={size}
    />
  )
}

function ClusterHealthChip({
  pingedAt,
  size = 'medium',
}: {
  pingedAt?: string | null
  size?: 'small' | 'medium' | 'large'
}) {
  const [now, setNow] = useState(moment())

  useEffect(() => {
    const int = setInterval(() => setNow(moment()), 1000)

    return () => clearInterval(int)
  }, [])

  const pinged = pingedAt !== null
  const healthy =
    pingedAt && now.clone().subtract(10, 'minutes').isBefore(pingedAt)

  return (
    <Tooltip
      label={
        pinged
          ? `Pinged at ${moment(pingedAt).format('MMM D, h:mm')}`
          : `This cluster was not pinged yet`
      }
    >
      <Chip
        severity={pinged ? (healthy ? 'success' : 'error') : 'warning'}
        size={size}
        clickable
      >
        {pinged ? (healthy ? 'Healthy' : 'Unhealthy') : 'Pending'}
      </Chip>
    </Tooltip>
  )
}
