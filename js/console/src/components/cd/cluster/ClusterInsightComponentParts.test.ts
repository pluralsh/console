import { InsightComponentPriority } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { sortInsightComponents } from './ClusterInsightComponentParts'

const component = (
  name: string,
  priority: InsightComponentPriority | null,
  namespace: string | null = 'apps'
) => ({ name, priority, namespace })

describe('sortInsightComponents', () => {
  it('lists the most urgent components first, then by namespace and name', () => {
    const sorted = sortInsightComponents([
      component('low-a', InsightComponentPriority.Low),
      component('crit-b', InsightComponentPriority.Critical),
      component('none', null),
      component('crit-a', InsightComponentPriority.Critical),
      component('crit-kube', InsightComponentPriority.Critical, 'kube-system'),
      component('med', InsightComponentPriority.Medium),
      component('high', InsightComponentPriority.High),
    ])

    expect(sorted.map((c) => c.name)).toEqual([
      'crit-a',
      'crit-b',
      'crit-kube',
      'high',
      'med',
      'low-a',
      'none',
    ])
  })

  it('does not change the input', () => {
    const input = [
      component('b', InsightComponentPriority.Low),
      component('a', InsightComponentPriority.Critical),
    ]

    sortInsightComponents(input)

    expect(input.map((c) => c.name)).toEqual(['b', 'a'])
  })
})
