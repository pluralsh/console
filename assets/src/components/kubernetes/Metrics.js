import React, { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { Loading } from 'forge-core'
import { POLL_INTERVAL } from './constants'
import { USAGE_Q } from './queries'
import { Graph, GraphHeader } from '../utils/Graph'
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
    <Box flex={false} direction='row' gap='small'>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall' pad='small'>
        <GraphHeader text='Overall CPU Usage' />
        <Box fill>
          <Graph data={[{id: 'cpu', data: cpuValues}]} />
        </Box>
      </Box>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall' pad='small'>
        <GraphHeader text='Overall Memory Usage' />
        <Box fill>
          <Graph data={[{id: 'memory', data: memValues}]} yFormat={filesize} />
        </Box>
      </Box>
    </Box>
  )
}

function PodGraphs({data: {cpu, mem}}) {
  const {cpuGraph, memGraph} = useMemo(() => {
    const cpuGraph = cpu.map(({metric: {pod}, values}) => ({id: pod, data: convertVals(values)}))
    const memGraph = mem.map(({metric: {pod}, values}) => ({id: pod, data: convertVals(values)}))
    return {cpuGraph, memGraph}
  }, [cpu, mem])

  return (
    <Box flex={false} direction='row' gap='small'>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall' pad='small'>
        <GraphHeader text='Pod CPU Usage' />
        <Box fill>
          <Graph data={cpuGraph} />
        </Box>
      </Box>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall' pad='small'>
        <Box fill>
          <GraphHeader text='Pod Memory Usage' />
          <Graph data={memGraph} yFormat={filesize} />
        </Box>
      </Box>
    </Box>
  )
}

export function Metric({name, namespace, regex}) {
  const {data} = useQuery(USAGE_Q, {
    variables: {
      cpuQuery: `sum(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"})`,
      memQuery: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"})`,
    },
    pollInterval: POLL_INTERVAL
  })
  const {data: podData} = useQuery(USAGE_Q, {
    variables: {
      cpuQuery: `avg(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}) by (pod)`,
      memQuery: `avg(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"}) by (pod)`,
    },
    pollInterval: POLL_INTERVAL
  })

  if (!data || !podData) return <Loading />
  return (
    <Box fill style={{overflow: 'auto'}} pad='medium' gap='small'>
      <Graphs data={data} />
      <PodGraphs data={podData} />
    </Box>
  )
}