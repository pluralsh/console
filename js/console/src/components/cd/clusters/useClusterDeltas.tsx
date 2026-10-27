import { ApolloCache, Reference, useApolloClient } from '@apollo/client'
import { Modifier, Modifiers } from '@apollo/client/cache'
import {
  ClusterDeltaSubscription,
  Delta,
  useClusterDeltaSubscription,
} from 'generated/graphql'
import { useEffect, useLayoutEffect, useRef } from 'react'

// polling is only a fallback for missed socket events once a view subscribes
export const CLUSTER_DELTA_FALLBACK_POLL_INTERVAL = 30_000

// a delete and the update before it can arrive back to back, so refetches are coalesced
const REFETCH_DEBOUNCE = 500

// root fields holding cluster connections, which deleted clusters are pruned from
const CLUSTER_LIST_FIELDS = ['clusters']

type ClusterDeltaPayload = NonNullable<
  NonNullable<ClusterDeltaSubscription['clusterDelta']>['payload']
>

type ClusterConnection = { edges?: Nullable<{ node?: Reference }[]> }

/**
 * Subscribes to a single cluster, or every cluster the user can read when no
 * id is given. Updates are merged into clusters already in the Apollo cache
 * and deletes are pruned from every cached cluster list. Results are
 * deliberately not written to the cache directly, since an unscoped
 * subscription would otherwise pull in every cluster it hears about.
 *
 * `refetch` is called (debounced) on any delta, for views showing fields the
 * delta doesn't carry. Every agent ping is a delta, so only pass it when
 * subscribing to a single cluster.
 */
export function useClusterDeltas({
  id,
  refetch,
  skip,
}: {
  id?: Nullable<string>
  refetch?: Nullable<() => unknown>
  skip?: boolean
} = {}) {
  const { cache } = useApolloClient()
  const refetchRef = useRef(refetch)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    refetchRef.current = refetch
  })

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  useClusterDeltaSubscription({
    variables: { id: id ?? undefined },
    skip,
    fetchPolicy: 'no-cache',
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const event = data?.clusterDelta
      const cluster = event?.payload
      if (!event?.delta || !cluster?.id) return

      if (event.delta === Delta.Delete) removeCluster(cache, cluster.id)
      else mergeCluster(cache, cluster)

      if (!refetchRef.current) return
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(
        () => refetchRef.current?.(),
        REFETCH_DEBOUNCE
      )
    },
  })
}

export function mergeCluster(
  cache: ApolloCache<unknown>,
  { __typename, id, ...fields }: ClusterDeltaPayload
) {
  // modify only touches fields an existing entity already has, so clusters
  // that aren't on screen are never added to the cache
  cache.modify({
    id: cache.identify({ __typename: 'Cluster', id }),
    fields: Object.fromEntries(
      Object.entries(fields).map(([field, value]) => [field, () => value])
    ) as Modifiers,
  })
}

export function removeCluster(cache: ApolloCache<unknown>, id: string) {
  const pruneConnection: Modifier<Nullable<ClusterConnection>> = (
    existing,
    { readField }
  ) => {
    const edges = existing?.edges
    if (!edges) return existing

    const kept = edges.filter((edge) => readField('id', edge?.node) !== id)
    return kept.length === edges.length
      ? existing
      : { ...existing, edges: kept }
  }

  cache.modify({
    id: 'ROOT_QUERY',
    fields: Object.fromEntries(
      CLUSTER_LIST_FIELDS.map((field) => [field, pruneConnection])
    ) as Modifiers,
  })
  cache.evict({ id: cache.identify({ __typename: 'Cluster', id }) })
  cache.gc()
}
