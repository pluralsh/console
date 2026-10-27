import { gql, InMemoryCache } from '@apollo/client'
import {
  DashboardGraphType,
  PublicWorkbenchDashboardGraphQuery,
  PublicWorkbenchDashboardQuery,
} from 'generated/graphql'
import {
  PublicWorkbenchDashboardDocument,
  PublicWorkbenchDashboardGraphDocument,
} from 'generated/graphql-documents'
import { describe, expect, it, vi } from 'vitest'

import { authenticatedCacheConfig, authlessCacheConfig } from './client'

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
    series: [
      {
        __typename: 'MetricResponse',
        name: 'requests',
        metric: null,
        values: [
          {
            __typename: 'MetricResult',
            timestamp: String(Date.parse(timeRange.start) / 1000),
            value: String(value),
          },
        ],
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

const userId = 'user-1'

// The jobs page no longer asks the polled counts query for people. This
// document still selects them so the cache policy stays covered.
const WorkbenchJobUserCountsDocument = gql`
  query WorkbenchJobUserCounts($id: ID!) {
    workbench(id: $id) {
      id
      runCounts {
        users {
          id
          name
          count
        }
      }
    }
  }
`

function jobCounts(workbenchId: string, count: number) {
  return {
    workbench: {
      __typename: 'Workbench' as const,
      id: workbenchId,
      runCounts: {
        __typename: 'WorkbenchJobCounts' as const,
        users: [
          {
            __typename: 'WorkbenchJobCountByUser' as const,
            id: userId,
            name: 'Ada',
            count,
          },
        ],
      },
    },
  }
}

function writeJobCounts(cache: InMemoryCache, workbenchId: string, count: number) {
  cache.writeQuery({
    query: WorkbenchJobUserCountsDocument,
    variables: { id: workbenchId },
    data: jobCounts(workbenchId, count),
  })
}

const readJobCounts = (cache: InMemoryCache, workbenchId: string) =>
  cache.readQuery({
    query: WorkbenchJobUserCountsDocument,
    variables: { id: workbenchId },
  })

describe('authenticatedCacheConfig', () => {
  it('keeps one person’s job count separate on each workbench', () => {
    const cache = new InMemoryCache(authenticatedCacheConfig)

    writeJobCounts(cache, 'wb-a', 1)
    writeJobCounts(cache, 'wb-b', 5)

    expect(readJobCounts(cache, 'wb-a')).toEqual(jobCounts('wb-a', 1))
    expect(readJobCounts(cache, 'wb-b')).toEqual(jobCounts('wb-b', 5))
    expect(cache.extract()[`WorkbenchJobCountByUser:${userId}`]).toBeUndefined()
  })

  it('shares one record per user without the type policy', () => {
    const cache = new InMemoryCache()

    writeJobCounts(cache, 'wb-a', 1)
    writeJobCounts(cache, 'wb-b', 5)

    expect(readJobCounts(cache, 'wb-a')?.workbench?.runCounts?.users?.[0]?.count).toBe(5)
  })
})
