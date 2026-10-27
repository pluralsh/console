import { ApolloCache, Reference, useApolloClient } from '@apollo/client'
import { Modifier, Modifiers } from '@apollo/client/cache'
import {
  Delta,
  ServiceDeploymentDeltaSubscription,
  useServiceDeploymentDeltaSubscription,
} from 'generated/graphql'
import { useDebouncedRefetch } from 'components/hooks/useDebouncedRefetch'

// polling is only a fallback for missed socket events once a view subscribes
export const SERVICE_DELTA_FALLBACK_POLL_INTERVAL = 30_000

// root fields holding service connections, which deleted services are pruned from
const SERVICE_LIST_FIELDS = ['serviceDeployments', 'serviceTree']

type ServiceDeltaPayload = NonNullable<
  NonNullable<
    ServiceDeploymentDeltaSubscription['serviceDeploymentDelta']
  >['payload']
>

type ServiceConnection = { edges?: Nullable<{ node?: Reference }[]> }

/**
 * Subscribes to a single service, a cluster's services, or every service the
 * user can see when neither is given. Updates are merged into services already
 * in the Apollo cache and deletes are pruned from every cached service list.
 * Results are deliberately not written to the cache directly, since an
 * unscoped subscription would otherwise pull in every service it hears about.
 *
 * `refetch` is called (debounced) on any delta, for views showing fields the
 * delta doesn't carry, like components or errors. `refetchOnCreate` is only
 * called for creates, for filtered or paginated lists that can't place a new
 * service themselves.
 */
export function useServiceDeltas({
  id,
  clusterId,
  refetch,
  refetchOnCreate,
  skip,
}: {
  id?: Nullable<string>
  clusterId?: Nullable<string>
  refetch?: Nullable<() => unknown>
  refetchOnCreate?: Nullable<() => unknown>
  skip?: boolean
} = {}) {
  const { cache } = useApolloClient()
  const onDelta = useDebouncedRefetch(refetch)
  const onCreate = useDebouncedRefetch(refetchOnCreate)

  useServiceDeploymentDeltaSubscription({
    variables: { id: id ?? undefined, clusterId: clusterId ?? undefined },
    skip,
    fetchPolicy: 'no-cache',
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const event = data?.serviceDeploymentDelta
      const service = event?.payload
      if (!event?.delta || !service?.id) return

      if (event.delta === Delta.Delete) removeService(cache, service.id)
      else mergeService(cache, service)

      onDelta()
      if (event.delta === Delta.Create) onCreate()
    },
  })
}

export function mergeService(
  cache: ApolloCache<unknown>,
  { __typename, id, ...fields }: ServiceDeltaPayload
) {
  // modify only touches fields an existing entity already has, so services
  // that aren't on screen are never added to the cache
  cache.modify({
    id: cache.identify({ __typename: 'ServiceDeployment', id }),
    fields: Object.fromEntries(
      Object.entries(fields).map(([field, value]) => [field, () => value])
    ) as Modifiers,
  })
}

export function removeService(cache: ApolloCache<unknown>, id: string) {
  const pruneConnection: Modifier<Nullable<ServiceConnection>> = (
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
      SERVICE_LIST_FIELDS.map((field) => [field, pruneConnection])
    ) as Modifiers,
  })
  cache.evict({ id: cache.identify({ __typename: 'ServiceDeployment', id }) })
  cache.gc()
}
