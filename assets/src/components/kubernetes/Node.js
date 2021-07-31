import React, { useCallback, useContext, useEffect, useMemo } from 'react'
import { Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { useQuery } from 'react-apollo'
import { NodeMetrics, POLL_INTERVAL } from './constants'
import { NODES_Q, NODE_METRICS_Q, NODE_Q, CLUSTER_SATURATION } from './queries'
import { HeaderItem, PodList, podResources, RowItem } from './Pod'
import { Box, Text, ThemeContext } from 'grommet'
import { useHistory, useParams } from 'react-router'
import { mapify, Metadata } from './Metadata'
import { ServerCluster } from 'grommet-icons'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { Readiness, ReadyIcon } from '../Application'
import { cpuParser, memoryParser } from 'kubernetes-resource-parser'
import filesize from 'filesize'
import { Events } from './Event'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { Graph } from '../utils/Graph'
import { format } from '../Dashboard'
import { ClusterMetrics as Metrics } from './constants'
import { sumBy } from 'lodash'
import { Doughnut } from 'react-chartjs-2'
import { normalizeColor } from 'grommet/utils'
import { RawContent } from './Component'

function NodeRowHeader() {
  return (
    <Box direction='row' align='center' border='bottom' pad='small'>
      <HeaderItem width='30%' text='name' />
      <HeaderItem width='10%' text='status' />
      <HeaderItem width='10%' text='region' />
      <HeaderItem width='10%' text='zone' />
      <HeaderItem width='10%' text='cpu' />
      <HeaderItem width='10%' text='memory' />
      <HeaderItem width='20%' text='pod cidr' />
    </Box>
  )
}

function NodeRow({node}) {
  let hist = useHistory()
  const labels = mapify(node.metadata.labels)
  const readiness = nodeReadiness(node.status)
  return (
    <Box direction='row' align='center' border='bottom' hoverIndicator='backgroundDark'
         onClick={() => hist.push(`/nodes/${node.metadata.name}`)} pad='small'>
      <Box flex={false} width='30%' direction='row' align='center' gap='xsmall'>
        <ServerCluster size='small' />
        <Text size='small'>{node.metadata.name}</Text>
      </Box>
      <Box flex={false} width='10%' direction='row' gap='xsmall' align='center'>
        <ReadyIcon readiness={readiness} />
        <Text size='small'>{nodeReadiness(node.status) === Readiness.Ready ? 'Ready' : 'Pending'}</Text>
      </Box>
      <RowItem width='10%' text={labels['failure-domain.beta.kubernetes.io/region']} />
      <RowItem width='10%' text={labels['failure-domain.beta.kubernetes.io/zone']} />
      <RowItem width='10%' text={cpuParser(node.status.capacity.cpu)} />
      <RowItem width='10%' text={filesize(memoryParser(node.status.capacity.memory))} />
      <RowItem width='20%' text={node.spec.podCidr} />
    </Box>
  )
}

const podContainers = (pods) => (
  pods.filter(({status: {phase}}) => phase !== 'Succeeded')
    .map(({spec: {containers}}) => containers)
    .flat()
)

function NodeGraphs({status: {capacity}, pods, name}) {
  const {requests, limits} = useMemo(() => {
    const containers = podContainers(pods)
    const requests = podResources(containers, 'requests')
    const limits = podResources(containers, 'limits')
    return {requests, limits}
  }, [pods])

  const localize = useCallback((metric) => metric.replaceAll("{instance}", name), [name])

  console.log(requests)
  console.log(limits)
  
  return (
    <Box flex={false} direction='row' gap='medium' align='center'>
      <LayeredGauage
        requests={requests.cpu}
        limits={limits.cpu}
        total={cpuParser(capacity.cpu)}
        name='CPU'
        title='CPU Reservation'
        stable
        format={cpuFmt} />
      <LayeredGauage
        requests={requests.memory}
        limits={limits.memory}
        total={memoryParser(capacity.memory)}
        name='Mem'
        title='Memory Reservation'
        stable
        format={filesize} />
      <Box fill='horizontal'>
        <SaturationGraphs 
          cpu={localize(NodeMetrics.CPU)}
          mem={localize(NodeMetrics.Memory)} />
      </Box>
    </Box>
  )
}

const round = (x) => Math.round(x * 100) / 100

const SimpleGauge = React.memo(({value, total, title, name}) => {
  const theme = useContext(ThemeContext)
  const val = value || 0
  const tot = total || 0

  return (
    <Box flex={false} height='200px' width='200px'>
      <Doughnut 
        data={{
          labels: [' ' + name, ` ${name} available`],
          datasets: [
            {
              label: name,
              data: [val, Math.max(tot - val, 0)],
              backgroundColor: [
                normalizeColor('success', theme),
                normalizeColor('cardDetailLight' ,theme)
              ],
              hoverOffset: 4,
              borderWidth: 0,
            }
          ]
        }} 
        options={{
          cutout: '75%',
          plugins: {
            legend: { display: false },
            title: {color: 'white', text: title, display: true}
          }
        }}
      />
    </Box>
  )
})

const LayeredGauage = React.memo(({requests, limits, total, title, name, format, stable}) => {
  const theme = useContext(ThemeContext)
  const data = useMemo(() => {
    const reqs = requests || 0
    const lims = limits || 0
    const tot = (total || 0)

    return {
      labels: [`${name} requests`, `${name} remaining`, `${name} limits`, `${name} remaining`],
      datasets: [
        {
          label: [`${name} requests`, `${name} available`],
          data: [reqs, Math.max(tot - reqs, 0)],
          backgroundColor: [
            normalizeColor('success', theme),
            normalizeColor('cardDetailLight' ,theme)
          ],
          // hoverOffset: 4,
          borderWidth: 0,
          hoverBorderWidth: 0,
        },
        {
          label: [`${name} limits`, `${name} available`],
          data: [lims, Math.max(tot - lims, 0)],
          backgroundColor: [
            normalizeColor('progress', theme),
            normalizeColor('cardDetailLight' ,theme)
          ],
          // hoverOffset: 4,
          hoverBorderWidth: 0,
          borderWidth: 0,
        },
      ]
    }
  }, [requests, limits, total, name, theme])

  return (
    <Box flex={false} height='200px' width='200px'>
      <Doughnut 
        data={data} 
        options={{
          cutout: '70%',
          animation: !stable ? {duration: 1000, easing: 'easeOutQuart'} : false,
          plugins: {
            legend: { display: false },
            title: {color: 'white', text: title, display: true},
            datalabels: {formatter: format},
            tooltip: {
              callbacks: {
                label: function(context) {
                  const labelIndex = (context.datasetIndex * 2) + context.dataIndex;
                  return ' ' + context.chart.data.labels[labelIndex] + ': ' + format(context.raw);
                }
              }
            }
          }
        }}
      />
    </Box>
  )
})

const datum = ({timestamp, value}) => ({x: new Date(timestamp * 1000), y: round(parseFloat(value))})

function SaturationGraphs({cpu, mem}) {
  const {data} = useQuery(CLUSTER_SATURATION, {
    variables: {cpuUtilization: cpu, memUtilization: mem, offset: 2 * 60 * 60},
    fetchPolicy: 'network-only',
    pollInterval: 10000
  })

  const result = useMemo(() => {
    if (!data) return null
    
    const {cpuUtilization, memUtilization} = data
    return ([
      {id: 'cpu utilization', data: cpuUtilization[0].values.map(datum)},
      {id: 'memory utilization', data: memUtilization[0].values.map(datum)}
    ])
  }, [data])

  if (!result) return null

  return (
    <Box fill='horizontal' gap='small' height='300px'>
      <Graph
        data={result}
        yFormat={(v) => format(v, 'percent')} />
    </Box>
  )
}

const cpuFmt = (cpu) => `${cpu}vcpu`

function ClusterGauges({nodes}) {
  const totalCpu = sumBy(nodes, ({status: {capacity: {cpu}}}) => cpuParser(cpu))
  const totalMem = sumBy(nodes, ({status: {capacity: {memory}}}) => memoryParser(memory))
  const totalPods = sumBy(nodes, ({status: {capacity: {pods}}}) => parseInt(pods))

  const {data} = useQuery(NODE_METRICS_Q, {
    variables: {
      cpuRequests: Metrics.CPURequests,
      cpuLimits: Metrics.CPULimits,
      memRequests: Metrics.MemoryRequests,
      memLimits: Metrics.MemoryLimits,
      pods: Metrics.Pods,
      offset: 5 * 60
    },
    fetchPolicy: 'network-first',
    pollInterval: 5000
  })

  const result = useMemo(() => {
    if (!data) return null
    const {cpuRequests, cpuLimits, memRequests, memLimits, pods} = data

    const datum = (data) => round(parseFloat(data[0].values[0].value))

    return {
      cpuRequests: datum(cpuRequests),
      cpuLimits: datum(cpuLimits),
      memRequests: datum(memRequests),
      memLimits: datum(memLimits),
      pods: datum(pods)
    }
  })

  if (!result) return null

  const {cpuRequests, cpuLimits, memRequests, memLimits, pods} = result

  return (
    <Box flex={false} direction='row' gap='small' align='center'>
      <LayeredGauage
        requests={cpuRequests}
        limits={cpuLimits}
        total={totalCpu}
        title='CPU Reservation'
        name='CPU'
        format={cpuFmt} />
      <LayeredGauage
        requests={memRequests}
        limits={memLimits}
        total={totalMem}
        title='Memory Reservation'
        name='Mem'
        format={filesize} />
      <SimpleGauge
        value={pods}
        total={totalPods}
        title='Pod Usage'
        name='Pods' />
    </Box>
  )
}

function ClusterMetrics({nodes}) {
  return (
    <Box flex={false} direction='row' fill='horizontal' gap='small' align='center' pad='small'>
      <ClusterGauges nodes={nodes} />
      <Box fill='horizontal' direction='row' align='center' gap='small'>
        <SaturationGraphs cpu={Metrics.CPU} mem={Metrics.Memory} />
      </Box>
    </Box>
  )
} 

function nodeReadiness(status) {
  const ready = status.conditions.find(({type}) => type === 'Ready')
  if (ready.status === 'True') return Readiness.Ready
  return Readiness.InProgress
}

export function Node() {
  const {name} = useParams()
  const {data, refetch} = useQuery(NODE_Q, {
    variables: {name}, 
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network'
  })
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    setBreadcrumbs([
      {text: 'nodes', url: '/nodes'},
      {text: name, url: `/nodes/${name}`}
    ])
  }, [])

  if (!data) return <LoopingLogo />

  const {node} = data
  return (
    <Box fill style={{overflow: 'auto'}} background='backgroundColor' pad='small' gap='small'>
      <Box direction='row' align='center' gap='small' pad='small'>
        <ServerCluster size='15px' />
        <Text size='small' weight='bold'>{node.metadata.name}</Text>
        <ReadyIcon readiness={nodeReadiness(node.status)} size='20px' showIcon />
      </Box>
      <NodeGraphs status={node.status} pods={node.pods} name={name} />
      <Tabs defaultTab='info' border='dark-3'>
        <TabHeader>
          <TabHeaderItem name='info'>
            <Text size='small' weight={500}>info</Text>
          </TabHeaderItem>
          <TabHeaderItem name='events'>
            <Text size='small' weight={500}>events</Text>
          </TabHeaderItem>
          <TabHeaderItem name='raw'>
            <Text size='small' weight={500}>raw</Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name='info'>
          <Metadata metadata={node.metadata} />
          <PodList pods={node.pods} refetch={refetch} />
        </TabContent>
        <TabContent name='events'>
          <Events events={node.events} />
        </TabContent>
        <TabContent name='raw'>
          <RawContent raw={node.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}

export function Nodes() {
  const {data} = useQuery(NODES_Q, {pollInterval: POLL_INTERVAL})
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    setBreadcrumbs([
      {text: 'nodes', url: '/nodes'}
    ])
  }, [])

  if (!data) return <LoopingLogo />

  return (
    <Box style={{overflow: 'auto'}} fill background='backgroundColor' pad='small' gap='small'>
      <Box flex={false}>
        <ClusterMetrics nodes={data.nodes} />
        <Box pad={{horizontal: 'small'}}>
          <Text size='small' weight={500}>Worker Nodes</Text>
        </Box>
        <Box flex={false}>
          <NodeRowHeader />
          {data.nodes.map((node, ind) => <NodeRow key={ind} node={node} />)}
        </Box>
      </Box>
    </Box>
  )
}