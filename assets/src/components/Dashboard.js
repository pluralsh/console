import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'
import { Loading } from 'forge-core'
import { DASHBOARD_Q } from './graphql/dashboards'
import { Box, Select, Text } from 'grommet'
import { chunk } from 'lodash'
import { Graph } from './utils/Graph'

function DashboardGraph({graph}) {
  const data = useMemo(() => (
    graph.queries.map(({legend, results}) => (
      {id: legend, data: results.map(({timestamp, value}) => ({x: timestamp, y: parseFloat(value)}))}
    ))
  ), [graph])

  return (
    <Box width='50%' pad='small' border='backgroundDark' background='white' height='300px'>
      <Box direction='row' align='center' justify='center'>
        <Text size='small' weight='bold'>{graph.name}</Text>
      </Box>
      <Box fill>
        <Graph data={data} />
      </Box>
    </Box>
  )
}

function LabelSelect({label, onSelect}) {
  const [value, setValue] = useState(label.values[0])

  return (
    <Select
      options={label.values}
      value={value}
      onChange={({value}) => {
        setValue(value)
        onSelect(value)
      }} />
  )
}

export default function Dashboard({repo, name}) {
  const [labelMap, setLabelMap] = useState(null)
  const labels = useMemo(() => Object.entries(labelMap || {}).map(([name, value]) =>  ({name, value})), [labelMap])
  const {data} = useQuery(DASHBOARD_Q, {variables: {repo, name, labels}, pollInterval: 1000 * 30, fetchPolicy: 'no-cache'})
  useEffect(() => {
    if (!labelMap && data && data.dashboard) {
      const map = data.dashboard.spec.labels.reduce((acc, {name, values}) => ({...acc, [name]: values[0]}), {})
      setLabelMap(map)
    }
  }, [data, labelMap, setLabelMap])
  const setLabel = useCallback((label, value) => setLabelMap({...labelMap, [label]: value}), [labelMap, setLabelMap])

  if (!data) return <Loading />
  const {dashboard} = data

  return (
    <Box fill background='backgroundColor' style={{overflow: 'auto'}}>
      <Box direction='row' pad='small' gap='small' justify='end' align='center'>
        {data.dashboard.spec.labels.filter(({values}) => values.length > 0).map((label) => (
          <LabelSelect label={label} onSelect={(value) => setLabel(label.name, value)} />
        ))}
      </Box>
      <Box fill pad={{horizontal: 'small', bottom: 'small'}}>
        {chunk(dashboard.spec.graphs, 2).map((chunk, ind) => (
          <Box flex={false} key={ind} direction='row' gap='small' margin={{vertical: 'small'}}>
            {chunk.map((graph) => <DashboardGraph key={graph.name} graph={graph} />)}
          </Box>
        ))}
      </Box>
    </Box>
  )
}