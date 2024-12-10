import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { Confirm } from 'components/utils/Confirm'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { InfoSection, PaddedCard, PropWideBold } from './common'
import { useDeleteJobMutation } from '../../../generated/graphql.ts'

export function DeleteJob({ name, namespace, refetch }) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useDeleteJobMutation({
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

export default function Job() {
  const { data } = useOutletContext<any>()

  if (!data?.job) return null

  const { job } = data

  return (
    <>
      <InfoSection title="Status">
        <PaddedCard>
          <PropWideBold title="Active">{job.status?.active || 0}</PropWideBold>
          <PropWideBold title="Succeeded">
            {job.status?.succeeded || 0}
          </PropWideBold>
          <PropWideBold title="Failed">{job.status?.failed || 0}</PropWideBold>
          <PropWideBold title="Completion time">
            {job.status?.completionTime || '-'}
          </PropWideBold>
          <PropWideBold title="Start time">
            {job.status?.startTime || '-'}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
      <InfoSection title="Spec">
        <PaddedCard>
          <PropWideBold title="Backoff limit">
            {job.spec?.backoffLimit || 0}
          </PropWideBold>
          <PropWideBold title="Parallelism">
            {job.spec?.parallelism || 0}
          </PropWideBold>
          <PropWideBold title="Deadline">
            {job.spec?.activeDeadlineSeconds || 0}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
    </>
  )
}
