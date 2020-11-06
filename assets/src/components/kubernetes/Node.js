import React, { useContext, useEffect } from 'react'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { POLL_INTERVAL } from './constants'
import { NODES_Q, NODE_Q } from './queries'
import { HeaderItem, PodList, podResources } from './Pod'
import { Box, Text } from 'grommet'
import { useHistory, useParams } from 'react-router'
import { mapify, Metadata, MetadataRow } from './Metadata'
import { ServerCluster } from 'grommet-icons'
import { BreadcrumbsContext } from '../Breadcrumbs'
import { Readiness, ReadyIcon } from '../Application'
import { cpuParser, memoryParser } from 'kubernetes-resource-parser'
import filesize from 'filesize'

function NodeRowHeader() {
  return (
    <Box direction='row' align='center' border='bottom' pad='small'>
      <HeaderItem width='20%' text='name' />
      <HeaderItem width='10%' text='status' />
      <HeaderItem width='10%' text='region' />
      <HeaderItem width='10%' text='zone' />
      <HeaderItem width='10%' text='cpu' />
      <HeaderItem width='10%' text='memory' />
      <HeaderItem width='30%' text='pod cidr' />
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
      <Box flex={false} width='20%' direction='row' align='center' gap='xsmall'>
        <ServerCluster size='small' />
        <Text size='small'>{node.metadata.name}</Text>
      </Box>
      <Box flex={false} width='10%' direction='row' gap='xsmall' align='center'>
        <ReadyIcon readiness={readiness} />
        <Text size='small'>{nodeReadiness(node.status) === Readiness.Ready ? 'Ready' : 'Pending'}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{labels['failure-domain.beta.kubernetes.io/region']}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{labels['failure-domain.beta.kubernetes.io/zone']}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{cpuParser(node.status.capacity.cpu)}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{filesize(memoryParser(node.status.capacity.memory))}</Text>
      </Box>
      <Box flex={false} width='30%'>
        <Text size='small'>{node.spec.podCidr}</Text>
      </Box>
    </Box>
  )
}

function NodeStatus({status: {capacity}, pods}) {
  const containers = pods.filter(({status: {phase}}) => phase !== 'Succeeded').map(({spec: {containers}}) => containers).flat()
  const {cpu, memory} = podResources(containers, 'requests')
  return (
    <Box flex={false} pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Status</Text>
      </Box>
      <MetadataRow name='cpu'>
        <Text size='small'>{cpuParser(capacity.cpu)} ({cpu} used)</Text>
      </MetadataRow>
      <MetadataRow name='memory'>
        <Text size='small'>{filesize(memoryParser(capacity.memory))} ({filesize(memory)} used)</Text>
      </MetadataRow>
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
  const {data, refetch} = useQuery(NODE_Q, {variables: {name}, pollInterval: POLL_INTERVAL})
  const {setBreadcrumbs} = useContext(BreadcrumbsContext)
  useEffect(() => {
    setBreadcrumbs([
      {text: 'nodes', url: '/nodes'},
      {text: name, url: `/nodes/${name}`}
    ])
  }, [])

  if (!data) return <Loading />

  const {node} = data
  return (
    <Box fill style={{overflow: 'auto'}} background='backgroundColor' pad='small' gap='small'>
      <Box direction='row' align='center' gap='small' pad='small'>
        <ServerCluster size='15px' />
        <Text size='small' weight='bold'>{node.metadata.name}</Text>
        <ReadyIcon readiness={nodeReadiness(node.status)} size='20px' showIcon />
      </Box>
      <Metadata metadata={node.metadata} />
      <NodeStatus status={node.status} pods={node.pods} />
      <PodList pods={node.pods} refetch={refetch} />
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

  if (!data) return <Loading />

  return (
    <Box style={{overflow: 'auto'}} fill background='backgroundColor' pad='small' gap='small'>
      <Box pad={{horizontal: 'small'}}>
        <Text size='small' weight={500}>Worker Nodes</Text>
      </Box>
      <Box fill style={{overflow: 'auto'}}>
        <NodeRowHeader />
        {data.nodes.map((node, ind) => <NodeRow key={ind} node={node} />)}
      </Box>
    </Box>
  )
}