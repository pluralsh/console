import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Box } from 'grommet'
import { format } from 'components/apps/app/dashboards/dashboard/misc'

import { Graph } from 'components/utils/Graph'

import { CLUSTER_SATURATION } from '../queries'

import { datum } from '../utils'

export function SaturationGraphs({ cpu, mem }) {
  const { data } = useQuery(CLUSTER_SATURATION, {
    variables: { cpuUtilization: cpu, memUtilization: mem, offset: 2 * 60 * 60 },
    fetchPolicy: 'network-only',
    pollInterval: 10000,
  })

  const result = useMemo(() => {
    if (!data) {
      return null
    }

    const { cpuUtilization, memUtilization } = data

    if (!cpuUtilization[0] || !memUtilization[0]) {
      return null
    }

    return ([
      { id: 'CPU usage', data: cpuUtilization[0].values.map(datum) },
      { id: 'Memory usage', data: memUtilization[0].values.map(datum) },
    ])
  }, [data])

  if (!result) {
    return null
  }

  return (
    <Box
      fill="horizontal"
      gap="small"
      height="300px"
    >
      <Graph
        data={result}
        yFormat={v => format(v, 'percent')}
        tickRotation={undefined}
      />
    </Box>
  )
}
