import React, { useState } from 'react'
import { Anchor, Box, Text } from 'grommet'
import { Loading, Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { useQuery } from 'react-apollo'
import { STATEFUL_SET_Q } from './queries'
import { Metadata, MetadataRow } from './Metadata'
import { useHistory, useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'
import { PodList } from './Pod'
import { RawContent } from './Component'
import { Events } from './Event'
import { Metric } from './Metrics'
import { Container, logUrl } from './utils'
import { DURATIONS, RangePicker } from '../Dashboard'

function Status({status: {currentReplicas, updatedReplicas, readyReplicas, replicas}, metadata}) {
  let history = useHistory()
  return (
    <Container header='Status'>
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
      <MetadataRow name='logs' final>
        <Anchor size='small' onClick={() => history.push(logUrl(metadata))}>
          view logs
        </Anchor>
      </MetadataRow>
    </Container>
  )
}

function Spec({spec: {serviceName}}) {
  return (
    <Container header='Spec'>
      <MetadataRow name='service'>
        <Text size='small'>{serviceName}</Text>
      </MetadataRow>
    </Container>
  )
}

export default function StatefulSet() {
  const [tab, setTab] = useState('info')
  const [duration, setDuration] = useState(DURATIONS[0])
  const {name, repo} = useParams()
  const {data, refetch} = useQuery(STATEFUL_SET_Q, {
    variables: {name, namespace: repo}, 
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network'
  })

  if (!data) return <Loading />

  const {statefulSet} = data
  return (
    <Box fill style={{overflow: 'auto'}}>
      <Tabs defaultTab='info' border='dark-3' onTabChange={setTab}
            headerEnd={tab === 'metrics' ? <RangePicker duration={duration} setDuration={setDuration} /> : null}>
        <TabHeader>
          <TabHeaderItem name='info'>
            <Text size='small' weight={500}>info</Text>
          </TabHeaderItem>
          <TabHeaderItem name='metrics'>
            <Text size='small' weight={500}>metrics</Text>
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
          <Status status={statefulSet.status} metadata={statefulSet.metadata} />
          <Spec spec={statefulSet.spec} />
          <PodList pods={statefulSet.pods} refetch={refetch} namespace={repo} />
        </TabContent>
        <TabContent name='metrics'>
          <Metric name={name} namespace={repo} regex='-[0-9]+' duration={duration} />
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