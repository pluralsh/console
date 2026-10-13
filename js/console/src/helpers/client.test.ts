import { InMemoryCache } from '@apollo/client'
import {
  DashboardGraphType,
  PublicWorkbenchDashboardDocument,
  PublicWorkbenchDashboardGraphDocument,
  PublicWorkbenchDashboardGraphQuery,
  PublicWorkbenchDashboardQuery,
} from 'generated/graphql'
import { describe, expect, it, vi } from 'vitest'

import { authlessCacheConfig } from './client'

vi.mock('./auth', () => ({ fetchToken: () => null }))

const publicId = 'abc123='
const timeRange = {
  start: '2026-10-09T10:00:00.000Z',
  end: '2026-10-09T11:00:00.000Z',
}

const page: PublicWorkbenchDashboardQuery = {
  publicWorkbenchDashboard: {
    __typename: 'PublicWorkbenchDashboard',
    name: 'Shared',
    description: 'A shared dashboard',
    graphs: [
      {
        __typename: 'PublicWorkbenchDashboardGraph',
        identifier: 'requests',
        title: 'Requests',
        description: null,
        type: DashboardGraphType.Timeseries,
        unit: null,
        sectionId: null,
        markdown: null,
        options: null,
        layout: {
          __typename: 'WorkbenchDashboardGraphLayout',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
        },
        hasDatasource: true,
      },
    ],
  },
}

const graph = (
  value: number
): PublicWorkbenchDashboardGraphQuery['publicWorkbenchDashboard'] => ({
  __typename: 'PublicWorkbenchDashboard',
  name: 'Shared',
  graph: {
    __typename: 'WorkbenchDashboardGraphResult',
    metrics: [
      {
        __typename: 'WorkbenchJobActivityMetric',
        timestamp: timeRange.start,
        name: 'requests',
        value,
        labels: null,
      },
    ],
    logs: null,
    traces: null,
  },
})

function writeAll(cache: InMemoryCache) {
  cache.writeQuery({
    query: PublicWorkbenchDashboardDocument,
    variables: { publicId },
    data: page,
  })
  for (const [identifier, value] of [
    ['requests', 1],
    ['errors', 2],
  ] as const)
    cache.writeQuery({
      query: PublicWorkbenchDashboardGraphDocument,
      variables: { publicId, identifier, timeRange },
      data: { publicWorkbenchDashboard: graph(value) },
    })
}

const readPage = (cache: InMemoryCache) =>
  cache.readQuery({
    query: PublicWorkbenchDashboardDocument,
    variables: { publicId },
  })

const readGraph = (cache: InMemoryCache, identifier: string) =>
  cache.readQuery({
    query: PublicWorkbenchDashboardGraphDocument,
    variables: { publicId, identifier, timeRange },
  })

describe('authlessCacheConfig', () => {
  it('keeps the public page query and panel graph queries side by side', () => {
    const cache = new InMemoryCache(authlessCacheConfig)
    writeAll(cache)

    expect(readPage(cache)).toEqual(page)
    expect(readGraph(cache, 'requests')).toEqual({
      publicWorkbenchDashboard: graph(1),
    })
    expect(readGraph(cache, 'errors')).toEqual({
      publicWorkbenchDashboard: graph(2),
    })
  })

  it('loses the page query without the type policy', () => {
    const cache = new InMemoryCache()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    writeAll(cache)

    expect(readPage(cache)).toBeNull()
  })
})
