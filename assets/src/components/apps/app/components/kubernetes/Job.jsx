import { useCallback, useState } from 'react'
import { Box, Text } from 'grommet'
import { useMutation, useQuery } from 'react-apollo'
import { useParams } from 'react-router-dom'
import {
  Confirm,
  TabContent,
  TabHeader,
  TabHeaderItem,
  Tabs,
  Trash,
} from 'forge-core'

import { LoopingLogo } from '../../../../utils/AnimatedLogo'

import { POLL_INTERVAL } from './constants'
import { Metadata, MetadataRow } from './Metadata'
import { DELETE_JOB, JOB_Q } from './queries'
import { Container } from './utils'
import { Events } from './Event'
import { RawContent } from './Component'
import { PodList, ignore } from './Pod'

export function DeleteIcon({ onClick, loading }) {
  return (
    <Box
      flex={false}
      pad="small"
      round="xsmall"
      align="center"
      justify="center"
      onClick={onClick}
      hoverIndicator="backgroundDark"
      focusIndicator={false}
    >
      <Trash
        color={loading ? 'dark-6' : 'error'}
        size="small"
      />
    </Box>
  )
}

export function DeleteJob({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_JOB, {
    variables: { name, namespace },
    onCompleted: () => {
      setConfirm(false); refetch()
    },
  })

  const doConfirm = useCallback(e => {
    ignore(e)
    setConfirm(true)
  }, [setConfirm])

  return (
    <>
      <DeleteIcon
        onClick={doConfirm}
        loading={loading}
      />
      {confirm && (
        <Confirm
          description="The pod will be replaced by it's managing controller"
          loading={loading}
          cancel={e => {
            ignore(e); setConfirm(false)
          }}
          submit={e => {
            ignore(e); mutation()
          }}
        />
      )}
    </>
  )
}

function Status({ status }) {
  return (
    <Container header="Status">
      <MetadataRow name="active">
        <Text size="small">{status.active}</Text>
      </MetadataRow>
      <MetadataRow name="succeeded">
        <Text size="small">{status.succeeded}</Text>
      </MetadataRow>
      <MetadataRow name="failed">
        <Text size="small">{status.failed}</Text>
      </MetadataRow>
      <MetadataRow name="completionTime">
        <Text size="small">{status.completionTime}</Text>
      </MetadataRow>
      <MetadataRow name="startTime">
        <Text size="small">{status.startTime}</Text>
      </MetadataRow>
    </Container>
  )
}

function Spec({ spec }) {
  return (
    <Container header="Spec">
      <MetadataRow name="backoffLimit">
        <Text size="small">{spec.backoffLimit}</Text>
      </MetadataRow>
      <MetadataRow name="parallelism">
        <Text size="small">{spec.parallelism}</Text>
      </MetadataRow>
      <MetadataRow
        name="deadline"
        final
      >
        <Text size="small">{spec.activeDeadlineSeconds}</Text>
      </MetadataRow>
    </Container>
  )
}

export default function Job() {
  const { repo, name } = useParams()
  const { data, refetch } = useQuery(JOB_Q, {
    variables: { name, namespace: repo },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  if (!data) return <LoopingLogo dark />

  const { job } = data

  return (
    <Box
      fill
      style={{ overflow: 'auto' }}
    >
      <Tabs defaultTab="info">
        <TabHeader>
          <TabHeaderItem name="info">
            <Text
              size="small"
              weight={500}
            >info
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="events">
            <Text
              size="small"
              weight={500}
            >events
            </Text>
          </TabHeaderItem>
          <TabHeaderItem name="raw">
            <Text
              size="small"
              weight={500}
            >raw
            </Text>
          </TabHeaderItem>
        </TabHeader>
        <TabContent name="info">
          <Metadata metadata={job.metadata} />
          <Status status={job.status} />
          <Spec spec={job.spec} />
          <PodList
            pods={job.pods}
            refetch={refetch}
            namespace={repo}
          />
        </TabContent>
        <TabContent name="events">
          <Events events={job.events} />
        </TabContent>
        <TabContent name="raw">
          <RawContent raw={job.raw} />
        </TabContent>
      </Tabs>
    </Box>
  )
}
