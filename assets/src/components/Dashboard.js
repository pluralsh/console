import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'
import { Loading } from 'forge-core'
import { DASHBOARD_Q } from './graphql/dashboards'
import { Box, Text } from 'grommet'
import { chunk } from 'lodash'
import { dateFormat, Graph } from './utils/Graph'

function DashboardGraph({graph}) {
  console.log(graph)
  const data = useMemo(() => (
    graph.queries.map(({name, results}) => (
      {id: name, data: results.map(({timestamp, value}) => ({x: timestamp, y: parseFloat(value)}))}
    ))
  ), [graph])

  return (
    <Box width='50%' pad='small' border='backgroundDark' background='white' height='300px'>
      <Box direction='row' align='center' justify='center'>
        <Text size='small'>{graph.name}</Text>
      </Box>
      <Box fill>
        <Graph data={data} />
      </Box>
    </Box>
  )
}

export default function Dashboard({repo, name}) {
  const [labelMap, setLabelMap] = useState(null)
  const labels = useMemo(() => Object.entries(labelMap || {}).map(([name, value]) =>  ({name, value})), [labelMap])
  const {data} = useQuery(DASHBOARD_Q, {variables: {repo, name, labels}, pollInterval: 1000 * 30})
  useEffect(() => {
    if (!labelMap && data && data.dashboard) {
      const map = data.dashboard.spec.labels.reduce((acc, {name, values}) => ({...acc, [name]: values[0]}), {})
      setLabelMap(map)
    }
  }, [data, labelMap, setLabelMap])

  if (!data) return <Loading />
  const {dashboard} = data
  console.log(dashboard)
  return (
    <Box fill background='backgroundColor' style={{overflow: 'auto'}}>
      {chunk(dashboard.spec.graphs, 2).map((chunk, ind) => (
        <Box key={ind} direction='row' gap='small' margin={{vertical: 'small'}}>
          {chunk.map((graph) => <DashboardGraph graph={graph} />)}
        </Box>
      ))}
    </Box>
  )
}