import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  absoluteRange,
  DEFAULT_TIME_RANGE,
  rangeWindow,
  startOfCurrentMinute,
  type TimeRange,
  type TimeWindow,
} from './timeRange'

const MINUTE_MS = 60 * 1000

/** Current minute; advances on each minute boundary while `live`. */
export function useLiveMinute(live: boolean) {
  const state = useState(startOfCurrentMinute)
  const setNow = state[1]

  useEffect(() => {
    if (!live) return
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      timeout = setTimeout(
        () => {
          setNow(startOfCurrentMinute())
          schedule()
        },
        MINUTE_MS - (Date.now() % MINUTE_MS) + 50
      )
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [live, setNow])

  return state
}

/**
 * Data to render for a query keyed on a time range: keeps the previous result
 * across live refetches, but drops it after a user-initiated range change
 * (a new `revision`) so callers show their loading state instead.
 */
export function useRangeQueryData<T>(
  {
    data,
    previousData,
  }: { data?: T | undefined; previousData?: T | undefined },
  revision: number
) {
  const [dataRevision, setDataRevision] = useState(revision)
  if (data && dataRevision !== revision) setDataRevision(revision)
  if (data) return data
  return dataRevision === revision ? previousData : undefined
}

export type TimeRangeState = {
  range: TimeRange
  now: Date
  timeWindow: TimeWindow
  /**
   * Bumped only on user-initiated changes, so live ticks can keep showing the
   * previous data while refetching instead of flashing loading states.
   */
  revision: number
  setRange: (range: TimeRange) => void
  selectWindow: (start: Date, end: Date) => void
}

export function useTimeRange(
  initial: TimeRange | (() => TimeRange) = DEFAULT_TIME_RANGE
): TimeRangeState {
  const [range, setRangeState] = useState<TimeRange>(initial)
  const [now, setNow] = useLiveMinute(range.live)
  const [revision, setRevision] = useState(0)

  const timeWindow = useMemo(() => rangeWindow(range, now), [range, now])
  const setRange = useCallback(
    (next: TimeRange) => {
      setRangeState(next)
      setNow(startOfCurrentMinute())
      setRevision((current) => current + 1)
    },
    [setNow]
  )
  const selectWindow = useCallback(
    (start: Date, end: Date) => setRange(absoluteRange(start, end)),
    [setRange]
  )

  return { range, now, timeWindow, revision, setRange, selectWindow }
}
