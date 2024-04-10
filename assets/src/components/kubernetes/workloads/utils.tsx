import { Chip, Tooltip, WrapWithIf } from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { isEmpty } from 'lodash'

import {
  V1_ContainerState as ContainerStateV1T,
  Pod_ContainerStatus as ContainerStatusT,
  V1_ContainerStatus as ContainerStatusV1T,
  Common_Event as EventT,
  Maybe,
  Common_PodInfo as PodInfoT,
} from '../../../generated/graphql-kubernetes'
import { Readiness, ReadinessT } from '../../../utils/status'

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
  warnings: Maybe<EventT>[]
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
  podInfo: PodInfoT
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

export function WorkloadStatusChip({ podInfo }: { podInfo: PodInfoT }) {
  const [status, severity] = podInfoStatus(podInfo)

  return (
    <WrapWithIf
      condition={podInfo.warnings?.length > 0}
      wrapper={
        <Tooltip
          label={podInfo.warnings?.map((ev) => ev?.message)?.join(', ')}
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
      {images.map((image) => (
        <span
          css={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {image}
        </span>
      ))}
    </div>
  )
}

export enum ContainerState {
  Waiting = 'Waiting',
  Running = 'Running',
  Terminated = 'Terminated',
  Unknown = 'Unknown',
}

export function toReadiness(
  status: ContainerStatusT | ContainerStatusV1T
): ReadinessT {
  let state = ''

  if (typeof status?.state === 'object') {
    state = toContainerState(status?.state)
  } else {
    state = status?.state ?? ContainerState.Unknown
  }

  switch (state) {
    case ContainerState.Running:
      return Readiness.Running
    case ContainerState.Waiting:
      return Readiness.InProgress
    case ContainerState.Terminated:
      return Readiness.Complete
  }

  return status?.ready ? Readiness.Ready : Readiness.Failed
}

function toContainerState(state: Nullable<ContainerStateV1T>): ContainerState {
  if (!state) {
    return ContainerState.Unknown
  }

  if (state?.running) {
    return ContainerState.Running
  }

  if (state?.terminated) {
    return ContainerState.Terminated
  }

  if (state?.waiting) {
    return ContainerState.Waiting
  }

  return ContainerState.Unknown
}
