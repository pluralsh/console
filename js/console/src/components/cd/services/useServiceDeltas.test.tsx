import { gql, InMemoryCache } from '@apollo/client'
import { ServiceDeploymentStatus } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import {
  componentsChanged,
  mergeService,
  removeService,
} from './useServiceDeltas'

const LIST = gql`
  query List($clusterId: ID) {
    serviceDeployments(clusterId: $clusterId) {
      edges {
        node {
          id
          name
          status
        }
      }
    }
  }
`

function service(id: string, status = ServiceDeploymentStatus.Stale) {
  return { __typename: 'ServiceDeployment' as const, id, name: id, status }
}

function delta(id: string, status: ServiceDeploymentStatus) {
  return { ...service(id, status), namespace: 'ns', version: '0.0.1' }
}

function cacheWith(variables: { clusterId?: string }, ids: string[]) {
  const cache = new InMemoryCache()
  cache.writeQuery({
    query: LIST,
    variables,
    data: {
      serviceDeployments: {
        __typename: 'ServiceDeploymentConnection',
        edges: ids.map((id) => ({
          __typename: 'ServiceDeploymentEdge',
          node: service(id),
        })),
      },
    },
  })
  return cache
}

function listedIds(cache: InMemoryCache, variables = {}) {
  return cache
    .readQuery<any>({ query: LIST, variables })
    ?.serviceDeployments.edges.map(({ node }) => node.id)
}

describe('mergeService', () => {
  it('updates services already in the cache', () => {
    const cache = cacheWith({}, ['a', 'b'])

    mergeService(cache, delta('a', ServiceDeploymentStatus.Healthy))

    expect(
      cache.readFragment<any>({
        id: 'ServiceDeployment:a',
        fragment: gql`
          fragment S on ServiceDeployment {
            status
          }
        `,
      })?.status
    ).toBe(ServiceDeploymentStatus.Healthy)
  })

  it('replaces cached errors, clearing them on an empty list', () => {
    const cache = new InMemoryCache()
    const fragment = gql`
      fragment E on ServiceDeployment {
        status
        errors {
          source
          message
          warning
        }
      }
    `
    const error = {
      __typename: 'ServiceError' as const,
      source: 'sync',
      message: 'broke',
      warning: null,
    }
    cache.writeFragment({
      id: 'ServiceDeployment:a',
      fragment,
      data: {
        __typename: 'ServiceDeployment',
        status: ServiceDeploymentStatus.Failed,
        errors: [error],
      },
    })

    mergeService(cache, {
      ...delta('a', ServiceDeploymentStatus.Healthy),
      errors: [],
    })

    expect(
      cache.readFragment<any>({ id: 'ServiceDeployment:a', fragment })
    ).toMatchObject({ status: ServiceDeploymentStatus.Healthy, errors: [] })
  })

  it('never adds services that are not cached', () => {
    const cache = cacheWith({}, ['a'])

    mergeService(cache, delta('unseen', ServiceDeploymentStatus.Healthy))

    expect(cache.extract()['ServiceDeployment:unseen']).toBeUndefined()
  })
})

describe('componentsChanged', () => {
  const healthy = {
    status: ServiceDeploymentStatus.Healthy,
    componentStatus: '3/3',
  }

  it('ignores deltas that keep the readiness rollup', () => {
    expect(
      componentsChanged(healthy, {
        ...delta('a', ServiceDeploymentStatus.Healthy),
        componentStatus: '3/3',
      })
    ).toBe(false)
  })

  it('flags a moved component count or service status', () => {
    expect(
      componentsChanged(healthy, {
        ...delta('a', ServiceDeploymentStatus.Healthy),
        componentStatus: '2/3',
      })
    ).toBe(true)
    expect(
      componentsChanged(healthy, {
        ...delta('a', ServiceDeploymentStatus.Stale),
        componentStatus: '3/3',
      })
    ).toBe(true)
  })

  it('flags anything before the service has loaded', () => {
    expect(
      componentsChanged(undefined, delta('a', ServiceDeploymentStatus.Healthy))
    ).toBe(true)
  })
})

describe('componentsChanged', () => {
  const healthy = {
    status: ServiceDeploymentStatus.Healthy,
    componentStatus: '3/3',
  }

  it('ignores deltas that keep the readiness rollup', () => {
    expect(
      componentsChanged(healthy, {
        ...delta('a', ServiceDeploymentStatus.Healthy),
        componentStatus: '3/3',
      })
    ).toBe(false)
  })

  it('flags a moved component count or service status', () => {
    expect(
      componentsChanged(healthy, {
        ...delta('a', ServiceDeploymentStatus.Healthy),
        componentStatus: '2/3',
      })
    ).toBe(true)
    expect(
      componentsChanged(healthy, {
        ...delta('a', ServiceDeploymentStatus.Stale),
        componentStatus: '3/3',
      })
    ).toBe(true)
  })

  it('flags anything before the service has loaded', () => {
    expect(
      componentsChanged(undefined, delta('a', ServiceDeploymentStatus.Healthy))
    ).toBe(true)
  })
})

describe('removeService', () => {
  it('drops the service from every cached list and evicts it', () => {
    const cache = cacheWith({}, ['a', 'b'])
    cache.writeQuery({
      query: LIST,
      variables: { clusterId: 'c' },
      data: {
        serviceDeployments: {
          __typename: 'ServiceDeploymentConnection',
          edges: [{ __typename: 'ServiceDeploymentEdge', node: service('a') }],
        },
      },
    })

    removeService(cache, 'a')

    expect(listedIds(cache)).toEqual(['b'])
    expect(listedIds(cache, { clusterId: 'c' })).toEqual([])
    expect(cache.extract()['ServiceDeployment:a']).toBeUndefined()
  })

  it('leaves lists alone for services that are not cached', () => {
    const cache = cacheWith({}, ['a'])

    removeService(cache, 'unseen')

    expect(listedIds(cache)).toEqual(['a'])
  })
})
