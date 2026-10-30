import { ApolloCache, Reference, useApolloClient } from '@apollo/client'
import { Modifier, Modifiers } from '@apollo/client/cache'
import {
  ClusterDeltaSubscription,
  Delta,
  useClusterDeltaSubscription,
} from 'generated/graphql'
import { useDebouncedRefetch } from 'components/hooks/useDebouncedRefetch'

// polling is only a fallback for missed socket events once a view subscribes
export const CLUSTER_DELTA_FALLBACK_POLL_INTERVAL = 30_000

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
 * `refetchOnCreate` is called (debounced) for creates only, for filtered or
 * paginated lists that can't place a new cluster themselves.
 */
export function useClusterDeltas({
  id,
  refetchOnCreate,
  skip,
}: {
  id?: Nullable<string>
  refetchOnCreate?: Nullable<() => unknown>
  skip?: boolean
} = {}) {
  const { cache } = useApolloClient()
  const onCreate = useDebouncedRefetch(refetchOnCreate)

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

      if (event.delta === Delta.Create) onCreate()
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
