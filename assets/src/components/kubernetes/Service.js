import React from 'react'
import { Box, Text } from 'grommet'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { SERVICE_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'
import { PodList } from './Pod'

function Status({status: {loadBalancer}}) {
  if (!loadBalancer) return null
  if (!loadBalancer.ingress || loadBalancer.ingress.length === 0) return null

  return (
    <Box flex={false} pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Status</Text>
      </Box>
      <MetadataRow name='ip'>
        <Text size='small'>{loadBalancer.ingress[0].ip}</Text>
      </MetadataRow>
    </Box>
  )
}

function PortRow({port: {name, protocol, port, targetPort}}) {
  return (
    <Box fill='horizontal' flex={false} direction='row' align='center'>
      {name && (<Box width='10%'>
        <Text size='small'>{name}</Text>
      </Box>)}
      <Box width='50px'>
        <Text size='small'>{protocol}</Text>
      </Box>
      <Box fill='horizontal'>
        <Text size='small'>{port} -> {targetPort}</Text>
      </Box>
    </Box>
  )
}

function Spec({spec: {clusterIp, type, ports}}) {
  return (
    <Box flex={false} pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Spec</Text>
      </Box>
      <MetadataRow name='Cluster Ip'>
        <Text size='small'>{clusterIp}</Text>
      </MetadataRow>
      <MetadataRow name='Type'>
        <Text size='small'>{type}</Text>
      </MetadataRow>
      <MetadataRow name='Ports'>
        <Box flex={false} fill='horizontal'>
          {ports.map((port) => <PortRow key={port.name} port={port} />)}
        </Box>
      </MetadataRow>
    </Box>
  )
}

export default function Service() {
  const {name, repo} = useParams()
  const {data, refetch} = useQuery(SERVICE_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {service} = data
  return (
    <Box fill style={{overflow: 'auto'}}>
      <Metadata metadata={service.metadata} />
      <Status status={service.status} />
      <Spec spec={service.spec} />
      <PodList pods={service.pods} refetch={refetch} namespace={repo} />
    </Box>
  )
}