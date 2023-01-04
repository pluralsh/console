import { Anchor, Box, Text } from 'grommet'
import { TabContent, Tabs } from 'forge-core'

import { useNavigate } from 'react-router-dom'

import { Readiness } from 'utils/status'

import { ReadyIcon } from '../../../../Component'

import { MetadataRow } from './Metadata'
import { Container } from './utils'
import { HeaderItem, RowItem } from './Pod'
import { DeleteJob } from './Job'

function Status({ status }) {
  return (
    <Container header="Status">
      <MetadataRow
        name="last scheduled"
        final
      >
        <Text size="small">{status.lastScheduleTime}</Text>
      </MetadataRow>
    </Container>
  )
}

function Spec({ spec }) {
  return (
    <Container header="Spec">
      <MetadataRow name="schedule">
        <Text size="small">{spec.schedule}</Text>
      </MetadataRow>
      <MetadataRow name="concurrency">
        <Text size="small">{spec.concurrencyPolicy}</Text>
      </MetadataRow>
      <MetadataRow
        name="suspend?"
        final
      >
        <Text size="small">{spec.suspend ? 'yes' : 'no'}</Text>
      </MetadataRow>
    </Container>
  )
}

function JobHeader() {
  return (
    <Box
      flex={false}
      fill="horizontal"
      direction="row"
      border="bottom"
      pad={{ vertical: 'xsmall' }}
      gap="xsmall"
    >
      <HeaderItem
        width="25%"
        text="name"
      />
      <HeaderItem
        width="15%"
        text="start time"
      />
      <HeaderItem
        width="15%"
        text="completion time"
      />
      <HeaderItem
        width="10%"
        text="active pods"
      />
      <HeaderItem
        width="10%"
        text="failed pods"
      />
      <HeaderItem
        width="25%"
        text="succeeded pods"
      />
    </Box>
  )
}

function readiness({ completionTime, failed }) {
  if (!completionTime) return Readiness.InProgress
  if (failed > 0) return Readiness.Failed

  return Readiness.Ready
}

function JobRow({ job: { metadata: { name, namespace }, status }, refetch }) {
  const navigate = useNavigate()

  return (
    <Box
      flex={false}
      fill="horizontal"
      align="center"
      direction="row"
      gap="xsmall"
      pad={{ vertical: 'xsmall' }}
    >
      <Box
        flex={false}
        direction="row"
        gap="xsmall"
        align="center"
        width="25%"
      >
        <ReadyIcon readiness={readiness(status)} />
        <Anchor
          size="small"
          onClick={() => navigate(`/components/${namespace}/job/${name}`)}
        >{name}
        </Anchor>
      </Box>
      <RowItem
        width="15%"
        text={status.startTime}
      />
      <RowItem
        width="15%"
        text={status.completionTime}
      />
      <RowItem
        width="10%"
        text={status.active}
      />
      <RowItem
        width="10%"
        text={status.failed}
      />
      <Box
        direction="row"
        gap="small"
        align="center"
        width="25%"
      >
        <Text size="small">{status.succeeded}</Text>
        <Box
          fill="horizontal"
          direction="row"
          justify="end"
          pad={{ right: 'small' }}
        >
          <DeleteJob
            namespace={namespace}
            name={name}
            refetch={refetch}
          />
        </Box>
      </Box>
    </Box>
  )
}

function Jobs({ jobs, refetch }) {
  return (
    <Box
      flex={false}
      pad="small"
    >
      <Box pad={{ vertical: 'small' }}>
        <Text size="small">Jobs</Text>
      </Box>
      <JobHeader />
      {jobs.map((job, i) => (
        <JobRow
          job={job}
          key={i}
          refetch={refetch}
        />
      ))}
    </Box>
  )
}

export default function CronJob() {
  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs defaultTab="info">
        <TabContent name="info">
          <Status status={cronJob.status} />
          <Spec spec={cronJob.spec} />
          <Jobs
            jobs={cronJob.jobs}
            refetch={refetch}
          />
        </TabContent>
      </Tabs>
    </Box>
  )
}
