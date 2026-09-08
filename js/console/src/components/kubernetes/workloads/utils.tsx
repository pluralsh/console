import { Chip, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { isEmpty } from 'lodash'

import { Maybe } from 'generated/graphql-plural'

import { Readiness, ReadinessT } from '../../../utils/status'
import { TruncateStart } from '../../utils/table/Truncate'
import { CommonEvent, CommonPodInfo } from '../../../generated/kubernetes'

const podStatusSeverity = {
  Running: 'success',
  Completed: 'info',
  Succeeded: 'info',
  Pending: 'warning',
  NotReady: 'warning',
  Failed: 'danger',
  Terminating: 'danger',
}

export function CronJobSuspendChip({
  suspend,
}: {
  suspend: boolean | undefined
}) {
  return (
    <Chip
      size="small"
      severity={suspend ? 'warning' : 'neutral'}
    >
      {suspend ? 'Suspended' : 'Running'}
    </Chip>
  )
}

export function PodStatusChip({
  status,
  warnings,
}: {
  status: string
  warnings: Maybe<CommonEvent>[]
}) {
  let severity = podStatusSeverity[status] ?? 'neutral'

  if (warnings?.length > 0) {
    severity = 'danger'
  }

  return (
    <WrapWithIf
      condition={warnings?.length > 0}
      wrapper={
        <Tooltip
          label={warnings?.map((ev) => ev?.message)?.join(', ')}
          placement="bottom"
        />
      }
    >
      <Chip
        size="small"
        severity={severity}
      >
        {status}
      </Chip>
    </WrapWithIf>
  )
}

function podInfoStatus(
  podInfo?: CommonPodInfo
): [string, ComponentProps<typeof Chip>['severity']] {
  if (!podInfo) return ['Unknown', 'neutral']
  const { desired, succeeded, running, pending, failed, warnings } = podInfo

  if (!isEmpty(warnings)) return ['Warning', 'danger']

  if (failed > 0) return ['Failed', 'danger']

  if (pending > 0) return ['Pending', 'warning']

  if (running > 0) return ['Running', 'success']

  if (succeeded > 0) return ['Succeeded', 'success']

  if (desired === 0) return ['Stopped', 'neutral']

  return ['Unknown', 'neutral']
}

export function WorkloadStatusChip({ podInfo }: { podInfo?: CommonPodInfo }) {
  const [status, severity] = podInfoStatus(podInfo)

  return (
    <WrapWithIf
      condition={(podInfo?.warnings?.length ?? 0) > 0}
      wrapper={
        <Tooltip
          label={podInfo?.warnings?.map((ev) => ev?.message)?.join(', ')}
          placement="bottom"
        />
      }
    >
      <Chip
        size="small"
        severity={severity}
      >
        {status}
      </Chip>
    </WrapWithIf>
  )
}

export function WorkloadImages({ images }: { images: Maybe<string>[] }) {
  if (isEmpty(images)) return null

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 300,
      }}
    >
      {images.map((image, index) => (
        <Tooltip
          key={index}
          label={image}
          placement="left-start"
        >
          <TruncateStart>{image}</TruncateStart>
        </Tooltip>
      ))}
    </div>
  )
}

export function toReadiness(state: string): ReadinessT {
  switch (state) {
    case 'Running':
      return Readiness.Running
    case 'Waiting':
      return Readiness.InProgress
    case 'Failed':
      return Readiness.Failed
    case 'Terminated':
      return Readiness.Complete
  }

  // TODO: Should default to unknown?
  return Readiness.Failed
}
