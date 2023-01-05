import { Card, IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { DELETE_JOB } from 'components/cluster/queries'
import { Confirm } from 'components/utils/Confirm'
import PropWide from 'components/utils/PropWide'
import { Flex, H2 } from 'honorable'
import { useState } from 'react'
import { useMutation } from 'react-apollo'
import { useOutletContext } from 'react-router-dom'

export function DeleteJob({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_JOB, {
    variables: { name, namespace },
    onCompleted: () => {
      setConfirm(false)
      refetch()
    },
  })

  return (
    <>
      <IconFrame
        clickable
        icon={<TrashCanIcon color="icon-danger" />}
        onClick={() => setConfirm(true)}
        textValue="Delete"
        tooltip
      />
      <Confirm
        close={() => setConfirm(false)}
        destructive
        label="Delete"
        loading={loading}
        open={confirm}
        submit={() => mutation()}
        title="Delete job"
        text="Are you sure?"
      />
    </>
  )
}

export default function ComponentInfoJob() {
  const { data } = useOutletContext<any>()

  if (!data?.job) return null

  const { job } = data

  return (
    <Flex direction="column">
      <H2 marginBottom="medium">Status</H2>
      <Card padding="large">
        <PropWide
          title="Active"
          fontWeight={600}
        >
          {job?.status?.active || 0}
        </PropWide>
        <PropWide
          title="Succeeded"
          fontWeight={600}
        >
          {job?.status?.succeeded || 0}
        </PropWide>
        <PropWide
          title="Failed"
          fontWeight={600}
        >
          {job?.status?.failed || 0}
        </PropWide>
        <PropWide
          title="Completion time"
          fontWeight={600}
        >
          {job?.status?.completionTime || '-'}
        </PropWide>
        <PropWide
          title="Start time"
          fontWeight={600}
        >
          {job?.status?.startTime || '-'}
        </PropWide>
      </Card>
      <H2
        marginBottom="medium"
        marginTop="large"
      >
        Spec
      </H2>
      <Card padding="large">
        <PropWide
          title="Backoff limit"
          fontWeight={600}
        >
          {job?.spec?.backoffLimit || 0}
        </PropWide>
        <PropWide
          title="Parallelism"
          fontWeight={600}
        >
          {job?.spec?.parallelism || 0}
        </PropWide>
        <PropWide
          title="Deadline"
          fontWeight={600}
        >
          {job?.spec?.activeDeadlineSeconds || 0}
        </PropWide>
      </Card>
    </Flex>
  )
}
