import React from 'react'
import { Box, Text } from 'grommet'
import { Loading, Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { useQuery } from 'react-apollo'
import { STATEFUL_SET_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'
import { PodList } from './Pod'
import { RawContent } from './Component'
import { Events } from './Event'

function Status({status: {currentReplicas, updatedReplicas, readyReplicas, replicas}}) {
  return (
    <Box flex={false} pad='small' gap='xsmall'>
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
    <Box flex={false} pad='small' gap='xsmall'>
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
  const {data, refetch} = useQuery(STATEFUL_SET_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {statefulSet} = data
  return (
    <Box fill style={{overflow: 'auto'}}>
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
          <Metadata metadata={statefulSet.metadata} />
          <Status status={statefulSet.status} />
          <Spec spec={statefulSet.spec} />
          <PodList pods={statefulSet.pods} refetch={refetch} namespace={repo} />
        </TabContent>
        <TabContent name='events'>
          <Events events={statefulSet.events} />
        </TabContent>
        <TabContent name='raw'>
          <RawContent raw={statefulSet.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}