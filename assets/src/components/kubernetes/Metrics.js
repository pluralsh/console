import React, { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { Loading } from 'forge-core'
import { POLL_INTERVAL } from './constants'
import { USAGE_Q } from './queries'
import { Graph, GraphHeader } from '../utils/Graph'
import filesize from 'filesize'
import { Box } from 'grommet'

const convertVals = (values) => values.map(({timestamp, value}) => ({x: new Date(timestamp * 1000), y: parseFloat(value)}))

function Graphs({cpu: [cpu], mem: [mem], tick}) {
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
          <Graph data={[{id: 'cpu', data: cpuValues}]} tick={tick} />
        </Box>
      </Box>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall' pad='small'>
        <GraphHeader text='Overall Memory Usage' />
        <Box fill>
          <Graph data={[{id: 'memory', data: memValues}]} yFormat={filesize} tick={tick} />
        </Box>
      </Box>
    </Box>
  )
}

function PodGraphs({cpu, mem, tick}) {
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
          <Graph data={cpuGraph} tick={tick} />
        </Box>
      </Box>
      <Box width='50%' height='300px' background='backgroundLight' round='xsmall' pad='small'>
        <Box fill>
          <GraphHeader text='Pod Memory Usage' />
          <Graph data={memGraph} yFormat={filesize} tick={tick} />
        </Box>
      </Box>
    </Box>
  )
}

export function Metric({name, namespace, regex, duration: {step, offset, tick}}) {
  const {data} = useQuery(USAGE_Q, {
    variables: {
      cpu: `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}[5m]))`,
      mem: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"})`,
      podCpu: `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}[5m])) by (pod)`,
      podMem: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"}) by (pod)`,
      step,
      offset
    },
    pollInterval: POLL_INTERVAL
  })

  if (!data) return <Loading />

  const {cpu, mem, podCpu, podMem} = data
  return (
    <Box fill style={{overflow: 'auto'}} pad='medium' gap='small'>
      <Graphs cpu={cpu} mem={mem} tick={tick} />
      <PodGraphs cpu={podCpu} mem={podMem} tick={tick} />
    </Box>
  )
}