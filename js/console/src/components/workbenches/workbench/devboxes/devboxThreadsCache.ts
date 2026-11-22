import { ApolloCache, Reference } from '@apollo/client'
import { DevboxThreadFragment } from 'generated/graphql'

// folds sessions from an index delta into the instance's cached thread list:
// the daemon reports threads and subagents it started (forks, imports, spawns)
// only as index rows, so new ones would otherwise never show up
export function mergeNewThreads(
  cache: ApolloCache<unknown>,
  instanceId: string,
  changed: DevboxThreadFragment[]
) {
  const id = cache.identify({ __typename: 'DevboxInstance', id: instanceId })
  if (!id || !changed.length) return

  cache.modify({
    id,
    fields: {
      threads(existing, { readField, toReference, storeFieldName }) {
        // filtered lists (stages, deleted) can't tell whether a row belongs
        if (!Array.isArray(existing) || storeFieldName !== 'threads')
          return existing
        const known = new Set(
          existing.map((ref) => readField<string>('id', ref))
        )
        const added = changed
          .filter((t) => !known.has(t.id))
          .map((t) => toReference({ __typename: 'DevboxThread', id: t.id }))
          .filter((ref): ref is Reference => !!ref)
        return added.length ? [...added, ...existing] : existing
      },
    },
  })
}
