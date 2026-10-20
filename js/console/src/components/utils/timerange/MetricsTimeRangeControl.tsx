import styled from 'styled-components'
import { TimeRangeControl } from './TimeRangeControl'
import type { TimeRangeState } from './useTimeRange'

/** Toolbar row with the time range control for a page of metrics graphs. */
export function MetricsTimeRangeControl({
  timeRange: { range, now, setRange },
}: {
  timeRange: TimeRangeState
}) {
  return (
    <RowSC>
      <TimeRangeControl
        value={range}
        now={now}
        onChange={setRange}
      />
    </RowSC>
  )
}

const RowSC = styled.div({
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'flex-end',
})
