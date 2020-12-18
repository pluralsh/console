import React from 'react'
import { Anchor, Box, Text } from 'grommet'
import { Loading, Tabs, TabContent, TabHeader, TabHeaderItem } from 'forge-core'
import { useQuery } from 'react-apollo'
import { Metadata, MetadataRow } from './Metadata'
import { useHistory, useParams } from 'react-router'
import { POLL_INTERVAL } from './constants'
import { RawContent } from './Component'
import { CRON_JOB_Q } from './queries'
import { Events } from './Event'
import { Container } from './utils'
import { HeaderItem, PodList, RowItem } from './Pod'
import { Readiness, ReadyIcon } from '../Application'

function Status({status}) {
  return (
    <Container header='Status'>
      <MetadataRow name='last scheduled' final>
        <Text size='small'>{status.lastScheduleTime}</Text>
      </MetadataRow>
    </Container>
  )
}

function Spec({spec}) {
  return (
    <Container header='Spec'>
      <MetadataRow name='schedule'>
        <Text size='small'>{spec.schedule}</Text>
      </MetadataRow>
      <MetadataRow name='concurrency'>
        <Text size='small'>{spec.concurrencyPolicy}</Text>
      </MetadataRow>
      <MetadataRow name='suspend?' final>
        <Text size='small'>{spec.suspend ? 'yes' : 'no'}</Text>
      </MetadataRow>
    </Container>
  )
}

function JobHeader() {
  return (
    <Box flex={false} fill='horizontal' direction='row' border='bottom' pad={{vertical: 'xsmall'}} gap='xsmall'>
      <HeaderItem width='20%' text='name' />
      <HeaderItem width='15%' text='start time' />
      <HeaderItem width='15%' text='completion time' />
      <HeaderItem width='10%' text='active pods' />
      <HeaderItem width='10%' text='failed pods' />
      <HeaderItem width='10%' text='succeeded pods' />
    </Box>
  )
}

function readiness({completionTime, failed}) {
  if (!completionTime) return Readiness.InProgress
  if (failed > 0) return Readiness.Failed
  return Readiness.Ready
}

function JobRow({job: {metadata: {name, namespace}, status}}) {
  let hist = useHistory()
  return (
    <Box flex={false} fill='horizontal' direction='row' gap='xsmall' pad={{vertical: 'xsmall'}}>
      <Box flex={false} direction='row' gap='xsmall' align='center' width='20%'>
        <ReadyIcon readiness={readiness(status)} />
        <Anchor size='small' onClick={() => hist.push(`/components/${namespace}/job/${name}`)}>{name}</Anchor>
      </Box>
      <RowItem width='15%' text={status.startTime} />
      <RowItem width='15%' text={status.completionTime} />
      <RowItem width='10%' text={status.active} />
      <RowItem width='10%' text={status.failed} />
      <RowItem width='10%' text={status.succeeded} />
    </Box>
  )
}

function Jobs({jobs}) {
  return (
    <Box flex={false} pad='small'>
      <Box pad={{vertical: 'small'}}>
        <Text size='small'>Jobs</Text>
      </Box>
      <JobHeader />
      {jobs.map((job, i) => <JobRow job={job} key={i} />)}
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
          <TabHeaderItem name='events'>
            <Text size='small' weight={500}>events</Text>
          </TabHeaderItem>
          <TabHeaderItem name='raw'>
            <Text size='small' weight={500}>raw</Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name='info'>
          <Metadata metadata={cronJob.metadata} />
          <Status status={cronJob.status} />
          <Spec spec={cronJob.spec} />
          <Jobs jobs={cronJob.jobs} />
        </TabContent>
        <TabContent name='events'>
          <Events events={cronJob.events} />
        </TabContent>
        <TabContent name='raw'>
          <RawContent raw={cronJob.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}