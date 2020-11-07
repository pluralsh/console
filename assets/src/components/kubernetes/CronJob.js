import React from 'react'
import { Box, Text } from 'grommet'
import { Loading, Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { useQuery } from 'react-apollo'
import { Metadata, MetadataRow } from './Metadata'
import { useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'
import { RawContent } from './Component'
import { CRON_JOB_Q } from './queries'

function Status({status}) {
  return (
    <Box flex={false} pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Status</Text>
      </Box>
      <MetadataRow name='last scheduled'>
        <Text size='small'>{status.lastScheduleTime}</Text>
      </MetadataRow>
    </Box>
  )
}

function Spec({spec}) {
  return (
    <Box flex={false} pad='small' gap='xsmall'>
      <Box>
        <Text size='small'>Spec</Text>
      </Box>
      <MetadataRow name='schedule'>
        <Text size='small'>{spec.schedule}</Text>
      </MetadataRow>
      <MetadataRow name='concurrency'>
        <Text size='small'>{spec.concurrencyPolicy}</Text>
      </MetadataRow>
      <MetadataRow name='suspend?'>
        <Text size='small'>{spec.suspend ? 'yes' : 'no'}</Text>
      </MetadataRow>
    </Box>
  )
}

export default function CronJob() {
  const {repo, name} = useParams()
  const {data} = useQuery(CRON_JOB_Q, {variables: {name, namespace: repo}, pollInterval: POLL_INTERVAL})

  if (!data) return <Loading />

  const {cronJob} = data
  return (
    <Box fill style={{overflow: 'auto'}}>
      <Tabs defaultTab='info' border='dark-3'>
        <TabHeader>
          <TabHeaderItem name='info'>
            <Text size='small' weight={500}>info</Text>
          </TabHeaderItem>
          <TabHeaderItem name='raw'>
            <Text size='small' weight={500}>raw</Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name='info'>
          <Metadata metadata={cronJob.metadata} />
          <Status status={cronJob.status} />
          <Spec spec={cronJob.spec} />
        </TabContent>
        <TabContent name='raw'>
          <RawContent raw={cronJob.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}