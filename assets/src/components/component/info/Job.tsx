import { IconFrame, TrashCanIcon } from '@pluralsh/design-system'
import { DELETE_JOB } from 'components/cluster/queries'
import { Confirm } from 'components/utils/Confirm'
import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

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

export default function Job() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  if (!data?.job) return null

  const { job } = data

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Status
      </InfoSectionH2>
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
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
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
    </div>
  )
}
