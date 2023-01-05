import type { Chip } from '@pluralsh/design-system'
import { ContainerStatus, Maybe, NodeStatus } from 'generated/graphql'
import { ComponentProps } from 'react'

type Severity = ComponentProps<typeof Chip>['severity']

const readinesses = ['Ready', 'InProgress', 'Failed', 'Complete'] as const

export type ReadinessT = typeof readinesses[number]
export const Readiness = Object.fromEntries(readinesses.map(r => [r, r])) as Record<ReadinessT, ReadinessT>

export const readinessToChipTitle: Record<ReadinessT, string> = {
  Ready: 'Ready',
  InProgress: 'Pending',
  Failed: 'Failed',
  Complete: 'Complete',
}

export const readinessToSeverity: Record<ReadinessT, Severity> = {
  Ready: 'success',
  InProgress: 'neutral',
  Failed: 'critical',
  Complete: 'success',
}

export const readinessToColor: Record<ReadinessT, Severity> = {
  Ready: 'text-success-light',
  InProgress: 'text-warning-light',
  Failed: 'text-danger-light',
  Complete: 'text-success-light',
}

export function nodeStatusToReadiness(status: NodeStatus): ReadinessT {
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

  return Readiness.Failed
}
