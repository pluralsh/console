import React from 'react'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { POLL_INTERVAL } from './constants'
import { NODES_Q } from './queries'
import { HeaderItem } from './Pod'
import { Box, Text } from 'grommet'


function NodeRowHeader() {
  return (
    <Box direction='row' align='center' border='bottom'>
      <HeaderItem width='20%' text='name' />
      <HeaderItem width='10%' text='cpu usage' />
      <HeaderItem width='10%' text='memory usage' />
      <HeaderItem width='30%' text='pod cidr' />
    </Box>
  )
}

function NodeRow({node}) {
  return (
    <Box direction='row' align='center' border='bottom'>
      <Box flex={false} width='20%'>
        <Text size='small'>{node.metadata.name}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{node.status.allocatable.cpu} / {node.status.capacity.cpu}</Text>
      </Box>
      <Box flex={false} width='10%'>
        <Text size='small'>{node.status.allocatable.memory} / {node.status.capacity.memory}</Text>
      </Box>
      <Box flex={false} width='30%'>
        <Text size='small'>{node.spec.podCidr}</Text>
      </Box>
    </Box>
  )
}

export function Nodes() {
  const {data} = useQuery(NODES_Q, {pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  return (
    <Box fill background='backgroundColor' pad='small' gap='small'>
      <Text size='small' weight={500}>Nodes</Text>
      <Box fill style={{overflow: 'auto'}}>
        <NodeRowHeader />
        {data.nodes.map((node, ind) => <NodeRow key={ind} node={node} />)}
      </Box>
    </Box>
  )
}