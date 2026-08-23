import { describe, expect, it } from 'vitest'
import { replaceKubernetesClusterId } from '../../routes/kubernetesRoutesConsts'
import {
  getDefaultKubernetesClusterId,
  isKubernetesClusterMissing,
  withCurrentCluster,
} from './clusterSelection'

describe('replaceKubernetesClusterId', () => {
  it('swaps only the kubernetes cluster path segment', () => {
    expect(
      replaceKubernetesClusterId(
        '/kubernetes/cluster-a/workloads/deployments',
        'cluster-a',
        'cluster-b'
      )
    ).toBe('/kubernetes/cluster-b/workloads/deployments')
  })

  it('does not use a raw substring replace', () => {
    expect(
      replaceKubernetesClusterId(
        '/kubernetes/cluster-a/workloads/cluster-a',
        'cluster-a',
        'cluster-b'
      )
    ).toBe('/kubernetes/cluster-b/workloads/cluster-a')
  })

  it('leaves unrelated paths unchanged', () => {
    expect(
      replaceKubernetesClusterId(
        '/cd/clusters/cluster-a',
        'cluster-a',
        'cluster-b'
      )
    ).toBe('/cd/clusters/cluster-a')
  })
})

describe('withCurrentCluster', () => {
  it('prepends the current cluster when it is missing from the page', () => {
    expect(
      withCurrentCluster([{ id: 'a' }, { id: 'b' }], { id: 'current' })
    ).toEqual([{ id: 'current' }, { id: 'a' }, { id: 'b' }])
  })

  it('does not duplicate the current cluster', () => {
    expect(withCurrentCluster([{ id: 'a' }, { id: 'b' }], { id: 'a' })).toEqual(
      [{ id: 'a' }, { id: 'b' }]
    )
  })
})

describe('getDefaultKubernetesClusterId', () => {
  const clusters = [
    { id: 'worker', self: false },
    { id: 'mgmt', self: true },
  ]

  it('prefers the last selected cluster when it still exists', () => {
    expect(getDefaultKubernetesClusterId(clusters, 'worker')).toBe('worker')
  })

  it('falls back to the management cluster', () => {
    expect(getDefaultKubernetesClusterId(clusters, 'gone')).toBe('mgmt')
  })

  it('returns undefined when there are no clusters', () => {
    expect(getDefaultKubernetesClusterId([], 'worker')).toBeUndefined()
  })
})

describe('isKubernetesClusterMissing', () => {
  it('does not treat a cluster as missing while the query is in flight', () => {
    expect(
      isKubernetesClusterMissing({
        clusterId: 'b',
        loading: true,
        hasData: true,
        currentClusterId: 'a',
        clusterIds: ['a'],
      })
    ).toBe(false)
  })

  it('does not redirect when the requested cluster is in the page even if cluster(id:) is stale', () => {
    expect(
      isKubernetesClusterMissing({
        clusterId: 'b',
        loading: false,
        hasData: true,
        currentClusterId: 'a',
        clusterIds: ['a', 'b'],
      })
    ).toBe(false)
  })

  it('does not redirect when the requested cluster is only on cluster(id:)', () => {
    expect(
      isKubernetesClusterMissing({
        clusterId: 'b',
        loading: false,
        hasData: true,
        currentClusterId: 'b',
        clusterIds: ['a'],
      })
    ).toBe(false)
  })

  it('flags a settled query whose cluster is neither listed nor returned by id', () => {
    expect(
      isKubernetesClusterMissing({
        clusterId: 'missing',
        loading: false,
        hasData: true,
        currentClusterId: undefined,
        clusterIds: ['a', 'mgmt'],
      })
    ).toBe(true)
  })
})
