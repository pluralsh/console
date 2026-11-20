import { gql, InMemoryCache } from '@apollo/client'
import {
  DevboxInteractionFragment,
  DevboxInteractionState,
} from 'generated/graphql'
import { describe, expect, it } from 'vitest'

import { mergePendingInteractions } from './devboxInteractions'

const QUERY = gql`
  query Pending($id: ID!) {
    devboxInstance(id: $id) {
      id
      interactions(pending: true) {
        id
        state
        title
      }
    }
  }
`

const interaction = (id: string, state: DevboxInteractionState) =>
  ({
    __typename: 'DevboxInteraction',
    id,
    state,
    title: `edit ${id}`,
  }) as unknown as DevboxInteractionFragment

function cacheWith(pending: DevboxInteractionFragment[]) {
  const cache = new InMemoryCache()
  cache.writeQuery({
    query: QUERY,
    variables: { id: 'inst' },
    data: {
      devboxInstance: {
        __typename: 'DevboxInstance',
        id: 'inst',
        interactions: pending,
      },
    },
  })
  return cache
}

const pendingIds = (cache: InMemoryCache) =>
  cache
    .readQuery<{ devboxInstance: { interactions: { id: string }[] } }>({
      query: QUERY,
      variables: { id: 'inst' },
    })
    ?.devboxInstance.interactions.map((i) => i.id)

describe('mergePendingInteractions', () => {
  it('adds new requests and drops resolved ones', () => {
    const cache = cacheWith([interaction('a', DevboxInteractionState.Pending)])
    const added = interaction('b', DevboxInteractionState.Pending)
    cache.writeFragment({
      fragment: gql`
        fragment I on DevboxInteraction {
          id
          state
          title
        }
      `,
      data: added,
    })

    mergePendingInteractions(cache, 'inst', [added])
    expect(pendingIds(cache)).toEqual(['a', 'b'])

    mergePendingInteractions(cache, 'inst', [
      interaction('a', DevboxInteractionState.Answered),
    ])
    expect(pendingIds(cache)).toEqual(['b'])
  })
})
