import { useMemo } from 'react'
import { Div } from 'honorable'

import { Graph } from 'components/utils/Graph'

import { MetricResult } from '../../../generated/graphql'
import { datum } from '../utils'
import { filesize } from 'filesize'

function format(value: number | null | undefined, format: string) {
  switch (format) {
    case 'bytes':
      return filesize(value ?? 0)
    case 'percent':
      return `${Math.round((value ?? 0) * 10000) / 100}%`
    default:
      return value
  }
}

export function SaturationGraphs({
  cpuTotal,
  memTotal,
  cpuUsage,
  memUsage,
}: {
  cpuTotal: number
  memTotal: number
  cpuUsage: Array<MetricResult>
  memUsage: Array<MetricResult>
}) {
  const result = useMemo(() => {
    if (!cpuUsage || !memUsage || cpuTotal === 0 || memTotal === 0) {
      return null
    }

    return [
      {
        id: 'CPU usage',
        data: cpuUsage
          .map(({ timestamp, value }) => ({
            timestamp,
            value: parseFloat(value ?? '0') / cpuTotal,
          }))
          .map(datum),
      },
      {
        id: 'Memory usage',
        data: memUsage
          .map(({ timestamp, value }) => ({
            timestamp,
            value: parseFloat(value ?? '0') / memTotal,
          }))
          .map(datum),
      },
    ]
  }, [cpuTotal, cpuUsage, memTotal, memUsage])

  if (!result) {
    return null
  }

  return (
    <Div
      height="240px"
      width="300px"
      flexGrow={1}
    >
      <Graph
        data={result}
        yFormat={(v) => format(v, 'percent')}
      />
    </Div>
  )
}
