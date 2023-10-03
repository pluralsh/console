import { useEffect, useState } from 'react'
import moment from 'moment'
import { Chip, Tooltip } from '@pluralsh/design-system'

export default function ClustersHealthChip({
  pingedAt,
  size = 'medium',
}: {
  pingedAt?: string | null
  size: 'small' | 'medium' | 'large'
}) {
  const [now, setNow] = useState(moment())

  useEffect(() => {
    const int = setInterval(() => setNow(moment()), 1000)

    return () => clearInterval(int)
  }, [])

  const pinged = pingedAt !== null
  const healthy =
    pingedAt && now.clone().subtract(2, 'minutes').isBefore(pingedAt)

  return (
    <Tooltip label={`Pinged at ${moment(pingedAt).format('MMM D, h:mm')}`}>
      <Chip
        severity={pinged ? (healthy ? 'success' : 'error') : 'warning'}
        size={size}
      >
        {pinged ? (healthy ? 'Healthy' : 'Unhealthy') : 'Pending'}
      </Chip>
    </Tooltip>
  )
}
