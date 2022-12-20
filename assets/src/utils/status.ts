const readinesses = ['Ready', 'InProgress', 'Failed', 'Complete'] as const

export type ReadinessT = typeof readinesses[number]
export const Readiness = Object.fromEntries(readinesses.map(r => [r, r])) as Record<ReadinessT, ReadinessT>

export const readinessToChipTitle: Record<ReadinessT, string> = {
  Ready: 'Ready',
  InProgress: 'Pending',
  Failed: 'Failed',
  Complete: 'Complete',
}
