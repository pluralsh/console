import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { Confirm } from 'components/utils/Confirm'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { toLower } from 'lodash'

import { InfoSection, PaddedCard, PropWideBold } from './common'
import { JobStatus, useDeleteJobMutation } from '../../../generated/graphql.ts'
import { ComponentDetailsContext } from '../ComponentDetails.tsx'

const JOB_COMPLETE = 'complete'
const JOB_FAILED = 'failed'
const CONDITION_TRUE = 'true'

export function getJobStatus(job: { status?: JobStatus | null }): string {
  for (const condition of job?.status?.conditions ?? []) {
    if (!condition) continue

    if (
      toLower(condition.type) === JOB_COMPLETE &&
      toLower(condition.status) === CONDITION_TRUE
    ) {
      return 'Complete'
    }

    if (
      toLower(condition.type) === JOB_FAILED &&
      toLower(condition.status) === CONDITION_TRUE
    ) {
      return 'Failed'
    }
  }

  return 'Running'
}

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
  const { componentDetails: job } = useOutletContext<ComponentDetailsContext>()

  if (job?.__typename !== 'Job') return null

  const status = getJobStatus(job)

  return (
    <>
      <InfoSection title="Status">
        <PaddedCard>
          <PropWideBold title="Status">{status}</PropWideBold>
          <PropWideBold title="Active">{job.status?.active || 0}</PropWideBold>
          <PropWideBold title="Succeeded">
            {job.status?.succeeded || 0}
          </PropWideBold>
          <PropWideBold title="Failed">{job.status?.failed || 0}</PropWideBold>
          <PropWideBold title="Completions">
            {job.spec?.completions || 0}
          </PropWideBold>
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
