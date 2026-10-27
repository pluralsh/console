import { InMemoryCache } from '@apollo/client'
import { StackStatus, StackType } from 'generated/graphql'
import { StackRunsDocument, StacksDocument } from 'generated/graphql-documents'
import { describe, expect, it } from 'vitest'

import { addRun, addStack, removeStack } from './useStackDeltas'

const pageInfo = (hasNextPage = false) => ({
  __typename: 'PageInfo' as const,
  hasNextPage,
  endCursor: null,
  hasPreviousPage: false,
  startCursor: null,
})

function stack(name: string, projectId = 'p') {
  return {
    __typename: 'InfrastructureStack' as const,
    id: name,
    insertedAt: null,
    updatedAt: null,
    deletedAt: null,
    name,
    type: StackType.Terraform,
    repository: null,
    paused: false,
    status: StackStatus.Successful,
    insight: null,
    parent: null,
    project: { __typename: 'Project' as const, id: projectId },
  }
}

function run(id: string, pullRequestId?: string) {
  return {
    __typename: 'StackRun' as const,
    id,
    insertedAt: null,
    git: { __typename: 'GitRef' as const, ref: 'main' },
    message: null,
    committer: null,
    status: StackStatus.Queued,
    approval: false,
    approvedAt: null,
    approver: null,
    insight: null,
    infracostResources: [],
    pullRequest: pullRequestId
      ? { __typename: 'PullRequest' as const, id: pullRequestId }
      : null,
  }
}

function writeStacks(
  cache: InMemoryCache,
  variables: Record<string, unknown>,
  names: string[],
  hasNextPage = false
) {
  cache.writeQuery({
    query: StacksDocument,
    variables: { first: 100, ...variables },
    data: {
      infrastructureStacks: {
        __typename: 'InfrastructureStackConnection',
        pageInfo: pageInfo(hasNextPage),
        edges: names.map((name) => {
          const { project: _, ...node } = stack(name)
          return { __typename: 'InfrastructureStackEdge' as const, node }
        }),
      },
    },
  })
}

function listedStacks(cache: InMemoryCache, variables = {}) {
  return cache
    .readQuery({
      query: StacksDocument,
      variables: { first: 100, ...variables },
    })
    ?.infrastructureStacks?.edges?.map((edge) => edge?.node?.name)
}

function writeRuns(
  cache: InMemoryCache,
  variables: Record<string, unknown>,
  ids: string[]
) {
  cache.writeQuery({
    query: StackRunsDocument,
    variables: { id: 's', first: 100, ...variables },
    data: {
      infrastructureStack: {
        __typename: 'InfrastructureStack',
        id: 's',
        runs: {
          __typename: 'StackRunConnection',
          pageInfo: pageInfo(),
          edges: ids.map((id) => {
            const { pullRequest: _, ...node } = run(id)
            return { __typename: 'StackRunEdge' as const, node }
          }),
        },
      },
    },
  })
}

function listedRuns(cache: InMemoryCache, variables = {}) {
  return cache
    .readQuery({
      query: StackRunsDocument,
      variables: { id: 's', first: 100, ...variables },
    })
    ?.infrastructureStack?.runs?.edges?.map((edge) => edge?.node?.id)
}

describe('addRun', () => {
  it('prepends created runs to the stack run list', () => {
    const cache = new InMemoryCache()
    writeRuns(cache, {}, ['b', 'a'])

    addRun(cache, 's', run('c'))

    expect(listedRuns(cache)).toEqual(['c', 'b', 'a'])
  })

  it('only adds runs to the list of their own pull request', () => {
    const cache = new InMemoryCache()
    writeRuns(cache, { pullRequestId: 'pr1' }, ['a'])
    writeRuns(cache, { pullRequestId: 'pr2' }, ['b'])

    addRun(cache, 's', run('c', 'pr1'))

    expect(listedRuns(cache, { pullRequestId: 'pr1' })).toEqual(['c', 'a'])
    expect(listedRuns(cache, { pullRequestId: 'pr2' })).toEqual(['b'])
  })

  it('never adds a run twice', () => {
    const cache = new InMemoryCache()
    writeRuns(cache, {}, ['a'])

    addRun(cache, 's', run('a'))

    expect(listedRuns(cache)).toEqual(['a'])
  })
})

describe('addStack', () => {
  it('inserts created stacks in name order', () => {
    const cache = new InMemoryCache()
    writeStacks(cache, {}, ['a', 'c'])

    addStack(cache, stack('b'))

    expect(listedStacks(cache)).toEqual(['a', 'b', 'c'])
  })

  it('skips searches, tag filters and other projects', () => {
    const cache = new InMemoryCache()
    writeStacks(cache, { q: 'a' }, ['a'])
    writeStacks(cache, { projectId: 'other' }, ['a'])
    writeStacks(cache, { projectId: 'p' }, ['a'])

    addStack(cache, stack('b'))

    expect(listedStacks(cache, { q: 'a' })).toEqual(['a'])
    expect(listedStacks(cache, { projectId: 'other' })).toEqual(['a'])
    expect(listedStacks(cache, { projectId: 'p' })).toEqual(['a', 'b'])
  })

  it('leaves stacks past the loaded pages for the page that holds them', () => {
    const cache = new InMemoryCache()
    writeStacks(cache, {}, ['a', 'b'], true)

    addStack(cache, stack('z'))

    expect(listedStacks(cache)).toEqual(['a', 'b'])
  })
})

describe('removeStack', () => {
  it('drops the stack from every cached list and evicts it', () => {
    const cache = new InMemoryCache()
    writeStacks(cache, {}, ['a', 'b'])
    writeStacks(cache, { projectId: 'p' }, ['a'])

    removeStack(cache, 'a')

    expect(listedStacks(cache)).toEqual(['b'])
    expect(listedStacks(cache, { projectId: 'p' })).toEqual([])
    expect(cache.extract()['InfrastructureStack:a']).toBeUndefined()
  })
})
