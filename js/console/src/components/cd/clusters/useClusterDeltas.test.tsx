import { gql, InMemoryCache } from '@apollo/client'
import { describe, expect, it } from 'vitest'

import { mergeCluster, removeCluster } from './useClusterDeltas'

const LIST = gql`
  query List($q: String) {
    clusters(q: $q) {
      edges {
        node {
          id
          name
          healthScore
        }
      }
    }
  }
`

function cluster(id: string, healthScore = 50) {
  return { __typename: 'Cluster' as const, id, name: id, healthScore }
}

function cacheWith(variables: { q?: string }, ids: string[]) {
  const cache = new InMemoryCache()
  cache.writeQuery({
    query: LIST,
    variables,
    data: {
      clusters: {
        __typename: 'ClusterConnection',
        edges: ids.map((id) => ({
          __typename: 'ClusterEdge',
          node: cluster(id),
        })),
      },
    },
  })
  return cache
}

function listedIds(cache: InMemoryCache, variables = {}) {
  return cache
    .readQuery<any>({ query: LIST, variables })
    ?.clusters.edges.map(({ node }) => node.id)
}

describe('mergeCluster', () => {
  it('updates clusters already in the cache', () => {
    const cache = cacheWith({}, ['a', 'b'])

    mergeCluster(cache, cluster('a', 90))

    expect(
      cache.readFragment<any>({
        id: 'Cluster:a',
        fragment: gql`
          fragment C on Cluster {
            healthScore
          }
        `,
      })?.healthScore
    ).toBe(90)
  })

  it('never adds clusters that are not cached', () => {
    const cache = cacheWith({}, ['a'])

    mergeCluster(cache, cluster('unseen', 90))

    expect(cache.extract()['Cluster:unseen']).toBeUndefined()
  })
})

describe('removeCluster', () => {
  it('drops the cluster from every cached list and evicts it', () => {
    const cache = cacheWith({}, ['a', 'b'])
    cache.writeQuery({
      query: LIST,
      variables: { q: 'a' },
      data: {
        clusters: {
          __typename: 'ClusterConnection',
          edges: [{ __typename: 'ClusterEdge', node: cluster('a') }],
        },
      },
    })

    removeCluster(cache, 'a')

    expect(listedIds(cache)).toEqual(['b'])
    expect(listedIds(cache, { q: 'a' })).toEqual([])
    expect(cache.extract()['Cluster:a']).toBeUndefined()
  })

  it('leaves lists alone for clusters that are not cached', () => {
    const cache = cacheWith({}, ['a'])

    removeCluster(cache, 'unseen')

    expect(listedIds(cache)).toEqual(['a'])
  })
})
