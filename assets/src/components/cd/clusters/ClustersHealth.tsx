import { Chip, Tooltip } from '@pluralsh/design-system'
import moment from 'moment'
import { useEffect, useState } from 'react'

type ClustersHealthProps = {
  pingedAt?: string | null
  size?: 'small' | 'medium' | 'large'
}

export default function ClustersHealth({
  pingedAt,
  size = 'medium',
}: ClustersHealthProps) {
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
