import { Card, LoopingLogo } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { DURATIONS } from 'utils/time'
import RangePicker from 'components/utils/RangePicker'
import { Div, Flex } from 'honorable'
import { Graph } from 'components/utils/Graph'
import { filesize } from 'filesize'
import GraphHeader from 'components/utils/GraphHeader'

import { POLL_INTERVAL } from '../../../../cluster/constants'
import { USAGE_Q } from '../../../../cluster/queries'

const convertVals = values => values.map(({ timestamp, value }) => ({ x: new Date(timestamp * 1000), y: parseFloat(value) }))

function Graphs({ cpu: [cpu], mem: [mem] }) {
  const { cpuValues, memValues } = useMemo(() => (
    { cpuValues: convertVals(cpu.values), memValues: convertVals(mem.values) }), [cpu, mem])

  return (
    <Flex
      gap="large"
      grow={1}
      height={320}
      padding="large"
    >
      <Flex
        direction="column"
        grow={1}
      >
        <GraphHeader title="Overall CPU Usage" />
        <Graph
          data={[{ id: 'cpu', data: cpuValues }]}
          yFormat={undefined}
          tickRotation={undefined}
        />
      </Flex>
      <Flex
        direction="column"
        grow={1}
      >
        <GraphHeader title="Overall Memory Usage" />
        <Graph
          data={[{ id: 'memory', data: memValues }]}
          yFormat={filesize}
          tickRotation={undefined}
        />
      </Flex>
    </Flex>
  )
}

function PodGraphs({ cpu, mem }) {
  const { cpuGraph, memGraph } = useMemo(() => {
    const cpuGraph = cpu.map(({ metric: { pod }, values }) => ({ id: pod, data: convertVals(values) }))
    const memGraph = mem.map(({ metric: { pod }, values }) => ({ id: pod, data: convertVals(values) }))

    return { cpuGraph, memGraph }
  }, [cpu, mem])

  return (
    <Flex
      gap="large"
      grow={1}
      height={320}
      padding="large"
    >
      <Flex
        direction="column"
        grow={1}
      >
        <GraphHeader title="Pod CPU Usage" />
        <Graph
          data={cpuGraph}
          yFormat={undefined}
          tickRotation={undefined}
        />
      </Flex>
      <Flex
        direction="column"
        grow={1}
      >
        <GraphHeader title="Pod Memory Usage" />
        <Graph
          data={memGraph}
          yFormat={filesize}
          tickRotation={undefined}
        />
      </Flex>
    </Flex>
  )
}

function Metric({
  name, namespace, regex, duration: { step, offset }, ...props
}) {
  const { data } = useQuery(USAGE_Q, {
    variables: {
      cpu: `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}[5m]))`,
      mem: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"})`,
      podCpu: `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}[5m])) by (pod)`,
      podMem: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"}) by (pod)`,
      step,
      offset,
    },
    pollInterval: POLL_INTERVAL,
  })

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo />
      </Flex>
    )
  }

  const {
    cpu, mem, podCpu, podMem,
  } = data

  return (
    <Card
      overflow="auto"
      padding="medium"
      gap="small"
      {...props}
    >
      <Graphs
        cpu={cpu}
        mem={mem}
      />
      <PodGraphs
        cpu={podCpu}
        mem={podMem}
      />
    </Card>
  )
}

const kindToRegex = {
  deployment: '-[a-z0-9]+-[a-z0-9]+',
  statefulset: '-[0-9]+',
}

export default function ComponentMetrics() {
  const { appName, componentKind = '', componentName } = useParams()
  const [duration, setDuration] = useState<any>(DURATIONS[0])

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      overflow="hidden"
    >
      <RangePicker
        duration={duration}
        setDuration={setDuration}
        position="sticky"
        top={0}
      />
      <Metric
        namespace={appName}
        name={componentName}
        regex={kindToRegex[componentKind]}
        duration={duration}
        maxHeight="100%"
        overflowY="auto"
      />
    </Flex>
  )
}
