import { ApolloCache, Reference } from '@apollo/client'
import {
  DevboxInteractionFragment,
  DevboxInteractionState,
} from 'generated/graphql'

const PENDING_ARGS = '"pending":true'

// folds interactions from an index delta into the instance's cached pending list:
// new requests show up, answered, cancelled and expired ones drop off
export function mergePendingInteractions(
  cache: ApolloCache<unknown>,
  instanceId: string,
  changed: DevboxInteractionFragment[]
) {
  const id = cache.identify({ __typename: 'DevboxInstance', id: instanceId })
  if (!id || !changed.length) return
  const byId = new Map(changed.map((i) => [i.id, i]))
  const pending = (i: Nullable<DevboxInteractionFragment>) =>
    i?.state === DevboxInteractionState.Pending

  cache.modify({
    id,
    fields: {
      interactions(existing, { readField, toReference, storeFieldName }) {
        if (!Array.isArray(existing) || !storeFieldName.includes(PENDING_ARGS))
          return existing
        const kept = existing.filter((ref) => {
          const update = byId.get(readField<string>('id', ref) ?? '')
          return !update || pending(update)
        })
        const known = new Set(kept.map((ref) => readField<string>('id', ref)))
        const added = changed
          .filter((i) => pending(i) && !known.has(i.id))
          .map((i) =>
            toReference({ __typename: 'DevboxInteraction', id: i.id })
          )
          .filter((ref): ref is Reference => !!ref)
        return [...kept, ...added]
      },
    },
  })
}
