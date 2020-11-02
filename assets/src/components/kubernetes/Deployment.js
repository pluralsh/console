import React from 'react'
import { Box, Text } from 'grommet'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { DEPLOYMENT_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'

function Status({status: {availableReplicas, replicas, unavailableReplicas}}) {
  return (
    <Box pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Status</Text>
      </Box>
      <MetadataRow name='replicas'>
        <Text size='small'>{replicas}</Text>
      </MetadataRow>
      <MetadataRow name='available'>
        <Text size='small'>{availableReplicas}</Text>
      </MetadataRow>
      <MetadataRow name='unavailable'>
        <Text size='small'>{unavailableReplicas}</Text>
      </MetadataRow>
    </Box>
  )
}

function Spec({spec: {strategy}}) {
  return (
    <Box pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Spec</Text>
      </Box>
      <MetadataRow name='strategy'>
        <Text size='small'>{strategy.type}</Text>
      </MetadataRow>
    </Box>
  )
}

export default function Deployment() {
  const {name, repo} = useParams()
  const {data} = useQuery(DEPLOYMENT_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {deployment} = data
  return (
    <Box fill>
      <Metadata metadata={deployment.metadata} />
      <Status status={deployment.status} />
      <Spec spec={deployment.spec} />
    </Box>
  )
}