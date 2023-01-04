import { useCallback, useState } from 'react'
import { Box, Text } from 'grommet'
import { useMutation } from 'react-apollo'
import {
  Confirm,
  TabContent,
  Tabs,
  Trash,
} from 'forge-core'

import { MetadataRow } from './Metadata'
import { DELETE_JOB } from './queries'
import { Container } from './utils'
import { ignore } from './pods/Pod'
import { PodList } from './pods/PodList'

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
  return (
    <Box>
      <Tabs defaultTab="info">
        <TabContent name="info">
          <Status status={job.status} />
          <Spec spec={job.spec} />
          <PodList
            pods={job.pods}
            refetch={refetch}
            namespace={repo}
          />
        </TabContent>
      </Tabs>
    </Box>
  )
}
