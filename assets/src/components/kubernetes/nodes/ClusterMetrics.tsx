import React from 'react'
import { Box } from 'grommet'

import { ClusterMetrics as Metrics } from '../constants'

import { ClusterGauges } from './ClusterGauges'
import { SaturationGraphs } from './SaturationGraphs'

export function ClusterMetrics({ nodes, usage }) {
  return (
    <Box
      flex={false}
      direction="row"
      fill="horizontal"
      gap="small"
      align="center"
      pad="small"
    >
      <ClusterGauges
        nodes={nodes}
        usage={usage}
      />
      <SaturationGraphs
        cpu={Metrics.CPU}
        mem={Metrics.Memory}
      />
      {/* <Box fill='horizontal' direction='row' align='center' gap='small'>
            </Box> */}
    </Box>
  )
}
