import { DevboxInstanceFragment, DevboxInstanceStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { instanceDetails } from './DevboxInstanceHeader'

const now = new Date('2026-11-20T12:00:00Z')

const instance = {
  id: 'inst-1',
  status: DevboxInstanceStatus.Running,
  awakeSince: '2026-11-20T09:45:00Z',
  runningThreads: 2,
  waitingThreads: 0,
  viewerCount: 1,
  repositories: ['https://github.com/pluralsh/console.git'],
  imageDigest: 'ghcr.io/pluralsh/devbox-fat@sha256:abcdef0123456789abcdef',
  snapshot: { id: 'snap-1', name: 'before-refactor' },
  devbox: {
    name: 'devbox',
    resources: { cpu: 4, memory: '16Gi', disk: '50Gi' },
    image: 'ghcr.io/pluralsh/devbox-fat:0.6.2',
    cluster: { id: 'c1', name: 'prod-us' },
  },
} as unknown as DevboxInstanceFragment

const asMap = (i: DevboxInstanceFragment) =>
  Object.fromEntries(instanceDetails(i, now).map((d) => [d.label, d.value]))

describe('instanceDetails', () => {
  it('summarizes size, placement, uptime and work', () => {
    expect(asMap(instance)).toEqual({
      Box: 'devbox',
      Size: '4 CPU · 16Gi · 50Gi disk',
      Cluster: 'prod-us',
      Up: '2h 15m',
      Threads: '2 running',
      Repo: 'pluralsh/console',
      'From snapshot': 'before-refactor',
    })
  })

  it('shows when a suspended instance went to sleep instead of uptime', () => {
    const details = asMap({
      ...instance,
      status: DevboxInstanceStatus.Suspended,
      suspendedAt: '2026-11-20T11:00:00Z',
      runningThreads: 0,
    })
    expect(details.Up).toBeUndefined()
    expect(details.Suspended).toBeTruthy()
    expect(details.Threads).toBeUndefined()
  })
})
