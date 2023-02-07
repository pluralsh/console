import { Div } from 'honorable'
import { useMemo } from 'react'
import { Graph } from 'components/utils/Graph'

import GraphHeader from 'components/utils/GraphHeader'

import { format } from './misc'

export default function DashboardGraph({ graph, tick }) {
  const data = useMemo(() => (
    graph.queries.map(({ legend, results }) => (
      {
        id: legend,
        data: results.map(({ timestamp, value }) => ({ x: new Date(timestamp * 1000), y: parseFloat(value) })),
      }
    ))
  ), [graph])

  return (
    <Div
      className="dashboard"
      padding="large"
      height={360}
      width="100%"
    >
      <GraphHeader title={graph.name} />
      <Graph
        data={data}
        yFormat={v => format(v, graph.format)}
        // @ts-ignore
        tick={tick}
        tickRotation={45}
      />
    </Div>
  )
}
