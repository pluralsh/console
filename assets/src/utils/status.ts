import type { Chip } from '@pluralsh/design-system'
import {
  ContainerStatus,
  Maybe,
  NodeStatus,
  PodStatus,
} from 'generated/graphql'
import { ComponentProps } from 'react'

type ReadinessI = 'Ready' | 'InProgress' | 'Failed' | 'Complete'
export const Readiness = {
  Ready: 'Ready',
  InProgress: 'InProgress',
  Failed: 'Failed',
  Complete: 'Complete',
} as const satisfies Record<ReadinessI, ReadinessI>
export type ReadinessT = typeof Readiness[ReadinessI]

export const readinessToLabel = {
  [Readiness.Ready]: 'Ready',
  [Readiness.InProgress]: 'Pending',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
} as const satisfies Record<ReadinessT, string>

export const readinessToContainerLabel = {
  [Readiness.Ready]: 'Running',
  [Readiness.InProgress]: 'Pending',
  [Readiness.Failed]: 'Failed',
  [Readiness.Complete]: 'Complete',
} as const satisfies Record<ReadinessT, string>

export const readinessToSeverity = {
  [Readiness.Ready]: 'success',
  [Readiness.InProgress]: 'info',
  [Readiness.Failed]: 'critical',
  [Readiness.Complete]: 'neutral',
} as const satisfies Record<ReadinessT, ComponentProps<typeof Chip>['severity']>

export const readinessToColor = {
  [Readiness.Ready]: 'text-success-light',
  [Readiness.InProgress]: 'text-warning-light',
  [Readiness.Failed]: 'text-danger-light',
  [Readiness.Complete]: 'text-success-light',
} as const satisfies Record<ReadinessT, string>

export function nodeStatusToReadiness(status: NodeStatus): ReadinessT {
  const ready = status?.conditions?.find(condition => condition?.type === 'Ready')

  if (ready?.status === 'True') return Readiness.Ready

  return Readiness.InProgress
}

export function podStatusToReadiness(status: PodStatus): ReadinessT {
  const ready = status?.conditions?.find(condition => condition?.type === 'Ready')

  if (ready?.status === 'True') return Readiness.Ready

  return Readiness.InProgress
}

export function containerStatusToReadiness(status?: Maybe<ContainerStatus>) {
  if (!status) return Readiness.InProgress
  const {
    ready,
    state,
  } = status

  if (ready && state?.terminated) return Readiness.Complete
  if (ready) return Readiness.Ready
  if (!state?.terminated) return Readiness.InProgress

  if (state?.terminated) {
    return state?.terminated?.exitCode === 0 ? Readiness.Complete : Readiness.Failed
  }

  return Readiness.Failed
}
