import { BreadcrumbsContext } from 'components/Breadcrumbs'
import { Card, LoopingLogo, PageTitle } from '@pluralsh/design-system'
import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
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
    <>
      <Div
        height={280}
        marginVertical="large"
      >
        <GraphHeader title="Overall CPU Usage" />
        <Graph
          data={[{ id: 'cpu', data: cpuValues }]}
          yFormat={undefined}
          tickRotation={undefined}
        />
      </Div>
      <Div
        height={280}
        marginVertical="large"
      >
        <GraphHeader title="Overall Memory Usage" />
        <Graph
          data={[{ id: 'memory', data: memValues }]}
          yFormat={filesize}
          tickRotation={undefined}
        />
      </Div>
    </>
  )
}

function PodGraphs({ cpu, mem }) {
  const { cpuGraph, memGraph } = useMemo(() => {
    const cpuGraph = cpu.map(({ metric: { pod }, values }) => ({ id: pod, data: convertVals(values) }))
    const memGraph = mem.map(({ metric: { pod }, values }) => ({ id: pod, data: convertVals(values) }))

    return { cpuGraph, memGraph }
  }, [cpu, mem])

  return (
    <>
      <Div
        height={280}
        marginVertical="large"
      >
        <GraphHeader title="Pod CPU Usage" />
        <Graph
          data={cpuGraph}
          yFormat={undefined}
          tickRotation={undefined}
        />
      </Div>
      <Div
        height={280}
        marginVertical="large"
      >
        <GraphHeader title="Pod Memory Usage" />
        <Graph
          data={memGraph}
          yFormat={filesize}
          tickRotation={undefined}
        />
      </Div>
    </>
  )
}

function Metric({
  name, namespace, regex, duration: { step, offset },
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
        <LoopingLogo scale={1} />
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
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)
  const [duration, setDuration] = useState<any>(DURATIONS[0])

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'components', url: `/apps/${appName}/components` },
    { text: componentName, url: `/apps/${appName}/components/${componentKind}/${componentName}` },
    { text: 'metrics', url: `/apps/${appName}/components/${componentKind}/${componentName}/metrics` },
  ]), [appName, componentKind, componentName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="Metrics">
        <RangePicker
          duration={duration}
          setDuration={setDuration}
        />
      </PageTitle>
      <Metric
        namespace={appName}
        name={componentName}
        regex={kindToRegex[componentKind]}
        duration={duration}
      />
    </>
  )
}
