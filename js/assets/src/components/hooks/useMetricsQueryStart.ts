import { useEffect, useMemo, useState } from 'react'

import { dayjsExtended as dayjs } from 'utils/datetime'

const REFRESH_INTERVAL_MS = 60_000

export function useMetricsQueryStart(offset: number) {
  const [now, setNow] = useState(() => dayjs())

  useEffect(() => {
    const interval = window.setInterval(
      () => setNow(dayjs()),
      REFRESH_INTERVAL_MS
    )

    return () => window.clearInterval(interval)
  }, [])

  return useMemo(
    () => now.subtract(offset, 'second').toISOString(),
    [now, offset]
  )
}
