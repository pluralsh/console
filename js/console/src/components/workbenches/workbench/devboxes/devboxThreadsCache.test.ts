import { gql, InMemoryCache } from '@apollo/client'
import { DevboxThreadFragment } from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { mergeNewThreads } from './devboxThreadsCache'

const QUERY = gql`
  query Threads($id: ID!) {
    devboxInstance(id: $id) {
      id
      threads {
        id
        kind
      }
      running: threads(stages: [RUNNING]) {
        id
        kind
      }
    }
  }
`

const thread = (id: string, kind = 'THREAD') =>
  ({ __typename: 'DevboxThread', id, kind }) as unknown as DevboxThreadFragment

function cacheWith(threads: DevboxThreadFragment[]) {
  const cache = new InMemoryCache()
  cache.writeQuery({
    query: QUERY,
    variables: { id: 'inst' },
    data: {
      devboxInstance: {
        __typename: 'DevboxInstance',
        id: 'inst',
        threads,
        running: threads,
      },
    },
  })
  return cache
}

const read = (cache: InMemoryCache) =>
  cache.readQuery<{
    devboxInstance: { threads: { id: string }[]; running: { id: string }[] }
  }>({ query: QUERY, variables: { id: 'inst' } })?.devboxInstance

describe('mergeNewThreads', () => {
  it('adds sessions the instance has not listed yet', () => {
    const cache = cacheWith([thread('t1')])
    const sub = thread('sub', 'SUBAGENT')
    cache.writeFragment({
      fragment: gql`
        fragment T on DevboxThread {
          id
          kind
        }
      `,
      data: sub,
    })

    mergeNewThreads(cache, 'inst', [thread('t1'), sub])
    expect(read(cache)?.threads.map((t) => t.id)).toEqual(['sub', 't1'])
    // a filtered list can't tell whether the new row belongs in it
    expect(read(cache)?.running.map((t) => t.id)).toEqual(['t1'])
  })
})
