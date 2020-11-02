import React from 'react'
import { Box, Text } from 'grommet'
import { Loading } from 'forge-core'
import { useQuery } from 'react-apollo'
import { STATEFUL_SET_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'

function Status({status: {currentReplicas, updatedReplicas, readyReplicas, replicas}}) {
  return (
    <Box pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Status</Text>
      </Box>
      <MetadataRow name='replicas'>
        <Text size='small'>{replicas}</Text>
      </MetadataRow>
      <MetadataRow name='current replicas'>
        <Text size='small'>{currentReplicas}</Text>
      </MetadataRow>
      <MetadataRow name='updated replicas'>
        <Text size='small'>{updatedReplicas}</Text>
      </MetadataRow>
      <MetadataRow name='ready replicas'>
        <Text size='small'>{readyReplicas}</Text>
      </MetadataRow>
    </Box>
  )
}

function Spec({spec: {serviceName}}) {
  return (
    <Box pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Spec</Text>
      </Box>
      <MetadataRow name='service'>
        <Text size='small'>{serviceName}</Text>
      </MetadataRow>
    </Box>
  )
}

export default function StatefulSet() {
  const {name, repo} = useParams()
  const {data} = useQuery(STATEFUL_SET_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {statefulSet} = data
  return (
    <Box fill>
      <Metadata metadata={statefulSet.metadata} />
      <Status status={statefulSet.status} />
      <Spec spec={statefulSet.spec} />
    </Box>
  )
}