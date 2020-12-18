import React from 'react'
import { Box, Text } from 'grommet'
import { useQuery } from 'react-apollo'
import { useParams } from 'react-router'
import { Loading, Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { POLL_INTERVAL } from './constants'
import { Metadata, MetadataRow } from './Metadata'
import { JOB_Q } from './queries'
import { Container } from './utils'
import { Events } from './Event'
import { RawContent } from './Component'
import { PodList } from './Pod'

function Status({status}) {
  return (
    <Container header='Status'>
      <MetadataRow name='active'>
        <Text size='small'>{status.active}</Text>
      </MetadataRow>
      <MetadataRow name='succeeded'>
        <Text size='small'>{status.succeeded}</Text>
      </MetadataRow>
      <MetadataRow name='failed'>
        <Text size='small'>{status.failed}</Text>
      </MetadataRow>
      <MetadataRow name='completionTime'>
        <Text size='small'>{status.completionTime}</Text>
      </MetadataRow>
      <MetadataRow name='startTime'>
        <Text size='small'>{status.startTime}</Text>
      </MetadataRow>
    </Container>
  )
}

function Spec({spec}) {
  return (
    <Container header='Spec'>
      <MetadataRow name='backoffLimit'>
        <Text size='small'>{spec.backoffLimit}</Text>
      </MetadataRow>
      <MetadataRow name='parallelism'>
        <Text size='small'>{spec.parallelism}</Text>
      </MetadataRow>
      <MetadataRow name='deadline' final>
        <Text size='small'>{spec.activeDeadlineSeconds}</Text>
      </MetadataRow>
    </Container>
  )
}

export default function Job() {
  const {repo, name} = useParams()
  const {data, refetch} = useQuery(JOB_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {job} = data

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
          <Metadata metadata={job.metadata} />
          <Status status={job.status} />
          <Spec spec={job.spec} />
          <PodList pods={job.pods} refetch={refetch} namespace={repo} />
        </TabContent>
        <TabContent name='events'>
          <Events events={job.events} />
        </TabContent>
        <TabContent name='raw'>
          <RawContent raw={job.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}