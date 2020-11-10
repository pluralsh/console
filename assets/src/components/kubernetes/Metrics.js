import React, { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { Loading } from 'forge-core'
import { POLL_INTERVAL } from './constants'
import { USAGE_Q } from './queries'
import { Graph } from '../utils/Graph'
import filesize from 'filesize'
import { Box } from 'grommet'

const convertVals = (values) => values.map(({timestamp, value}) => ({x: new Date(timestamp * 1000), y: parseFloat(value)}))

function Graphs({data: {cpu: [cpu], mem: [mem]}}) {
  const {cpuValues, memValues} = useMemo(() => {
    const cpuValues = convertVals(cpu.values)
    const memValues = convertVals(mem.values)
    return {cpuValues, memValues}
  }, [cpu, mem])

  return (
    <Box direction='row' gap='small' pad='medium'>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall'>
        <Graph data={[{id: 'cpu', data: cpuValues}]} />
      </Box>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall'>
        <Graph data={[{id: 'memory', data: memValues}]} yFormat={filesize} />
      </Box>
    </Box>
  )
}

export function Metric({name, namespace}) {
  const {data} = useQuery(USAGE_Q, {
    variables: {
      cpuQuery: `sum(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}.*"})`,
      memQuery: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}.*"})`,
    },
    pollInterval: POLL_INTERVAL
  })
  console.log(data)

  if (!data) return <Loading />
  return <Graphs data={data} />
}