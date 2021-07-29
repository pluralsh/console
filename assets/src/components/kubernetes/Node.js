import React, { useContext, useEffect, useMemo } from 'react'
import { Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { useQuery } from 'react-apollo'
import { POLL_INTERVAL } from './constants'
import { NODES_Q, NODE_Q } from './queries'
import { HeaderItem, PodList, podResources, RowItem } from './Pod'
import { Box, Text } from 'grommet'
import { useHistory, useParams } from 'react-router'
import { mapify, Metadata } from './Metadata'
import { ServerCluster } from 'grommet-icons'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { Readiness, ReadyIcon } from '../Application'
import { cpuParser, memoryParser } from 'kubernetes-resource-parser'
import filesize from 'filesize'
import { Events } from './Event'
import { Container } from './utils'
import { LoopingLogo } from '../utils/AnimatedLogo'
import { METRICS_Q } from '../graphql/dashboards'
import { Graph, GraphHeader } from '../utils/Graph'
import { format } from '../Dashboard'
import { ClusterMetrics as Metrics } from './constants'
import { Gauge } from '../utils/ProgressGauge'
import { sumBy } from 'lodash'

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

function NodeStatus({status: {capacity}, pods}) {
  const containers = pods.filter(({status: {phase}}) => phase !== 'Succeeded').map(({spec: {containers}}) => containers).flat()
  const {cpu, memory} = podResources(containers, 'requests')
  return (    
    <Container header='Status'>
      <Box direction='row' gap='medium' align='center'>
        <SimpleGauge
          current={cpu}
          total={cpuParser(capacity.cpu)}
          name='CPU'
          format={format} />
        <SimpleGauge
          total={memoryParser(capacity.memory)}
          current={memory}
          name='Mem'
          format={filesize} />
      </Box>
    </Container>
  )
}

const round = (x) => Math.round(x * 100) / 100

function SimpleGauge({current, total, name, format}) {
  return (
    <Box flex={false} height='200px' width='200px'>
      <Gauge
        current={current || 0}
        total={total || 0}
        ratio={1}
        modifier={name}
        format={format} />
    </Box>
  )
}

function MetricsGauge({metric, max, name, format}) {
  const {data} = useQuery(METRICS_Q, {
    variables: {query: metric, offset: 5 * 60},
    fetchPolicy: 'network-only',
    pollInterval: 60000
  })

  if (!data) return null

  const result = round(parseFloat(data.metric[0].values[0].value))

  return (<SimpleGauge current={result} total={max} name={name} format={format} />)
}

function MetricsGraph({metric, format: fmt, header, name}) {
  const {data} = useQuery(METRICS_Q, {
    variables: {query: metric, offset: 2 * 60 * 60}, 
    fetchPolicy: 'network-only',
    pollInterval: 60000
  })

  const result = useMemo(() => {
    if (!data || !data.metric) return null
    return [{
      id: name, 
      data: data.metric[0].values.map(({timestamp, value}) => (
        {x: new Date(timestamp * 1000), y: round(parseFloat(value))}
      ))
    }]
  }, [data])

  if (!result) return null

  console.log(result)

  return (
    <Box className='dashboard' round='xsmall' width='50%' 
         pad='small' background='cardDetail' height='300px'>
      <GraphHeader text={header} />
      <Graph
        data={result}
        yFormat={(v) => format(v, fmt || 'percent')} />
    </Box>
  )
}

function ClusterMetrics({nodes}) {
  const totalCpu = sumBy(nodes, ({status: {capacity: {cpu}}}) => cpuParser(cpu))
  const totalMem = sumBy(nodes, ({status: {capacity: {memory}}}) => memoryParser(memory))

  return (
    <Box flex={false} direction='row' fill='horizontal' gap='small' align='center' pad='small'>
      <MetricsGauge 
        metric={Metrics.CPURequests} 
        name='CPU'
        max={totalCpu} />
      <MetricsGauge 
        metric={Metrics.MemoryRequests}
        name='Mem'
        max={totalMem}
        format={filesize} />
      <Box fill='horizontal' direction='row' align='center' gap='small'>
        <MetricsGraph name='cpu' metric={Metrics.CPU} header='CPU Utilization' />
        <MetricsGraph name='mem' metric={Metrics.Memory} header="Memory Utilization" />
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
      <Tabs defaultTab='info' border='dark-3'>
        <TabHeader>
          <TabHeaderItem name='info'>
            <Text size='small' weight={500}>info</Text>
          </TabHeaderItem>
          <TabHeaderItem name='events'>
            <Text size='small' weight={500}>events</Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name='info'>
          <Metadata metadata={node.metadata} />
          <NodeStatus status={node.status} pods={node.pods} />
          <PodList pods={node.pods} refetch={refetch} />
        </TabContent>
        <TabContent name='events'>
          <Events events={node.events} />
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