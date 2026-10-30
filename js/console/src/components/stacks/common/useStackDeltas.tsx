import { ApolloCache, Reference, useApolloClient } from '@apollo/client'
import { Modifier, Modifiers } from '@apollo/client/cache'
import {
  Delta,
  StackListEntryQuery,
  StackListEntryQueryVariables,
  StackRunDeltaSubscription,
  useInfrastructureStackDeltaSubscription,
  useStackRunDeltaSubscription,
} from 'generated/graphql'
import {
  StackListEntryDocument,
  StackRunFragmentDoc,
  StackTinyFragmentDoc,
} from 'generated/graphql-documents'

// polling is only a fallback for missed socket events once a page subscribes
export const STACK_DELTA_FALLBACK_POLL_INTERVAL = 30_000

type Connection = {
  edges?: Nullable<{ node?: Reference }[]>
  pageInfo?: { hasNextPage?: boolean }
}

type StackListEntry = NonNullable<StackListEntryQuery['infrastructureStack']>

type StackRunDeltaPayload = NonNullable<
  NonNullable<StackRunDeltaSubscription['stackRunDelta']>['payload']
>

/**
 * Call once for the whole stacks tab. Updated stacks are normalized into the
 * Apollo cache as they arrive, so only creates and deletes need handling here.
 */
export function useStackDeltas() {
  const client = useApolloClient()

  useInfrastructureStackDeltaSubscription({
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const event = data?.infrastructureStackDelta
      const id = event?.payload?.id
      if (!id) return

      if (event.delta === Delta.Delete) removeStack(client.cache, id)
      if (event.delta === Delta.Create)
        client
          .query<StackListEntryQuery, StackListEntryQueryVariables>({
            query: StackListEntryDocument,
            variables: { id },
            fetchPolicy: 'network-only',
          })
          .then(({ data }) => {
            if (data?.infrastructureStack)
              addStack(client.cache, data.infrastructureStack)
          })
          .catch(() => {})
    },
  })
}

/**
 * Runs of one stack, which the server authorizes once against the stack.
 * Updates are normalized into the cache like stacks, and created runs are
 * added to the stack's cached run lists.
 */
export function useStackRunDeltas(stackId: Nullable<string>) {
  const { cache } = useApolloClient()

  useStackRunDeltaSubscription({
    variables: { stackId: stackId ?? '' },
    skip: !stackId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const event = data?.stackRunDelta
      if (stackId && event?.delta === Delta.Create && event.payload)
        addRun(cache, stackId, event.payload)
    },
  })
}

// cached connection fields are keyed by their arguments, like `runs({"first":100})`
function storeFieldArgs(storeFieldName: string): Record<string, unknown> {
  const start = storeFieldName.indexOf('(')
  if (start < 0) return {}
  try {
    return JSON.parse(storeFieldName.slice(start + 1, -1))
  } catch {
    return {}
  }
}

const isFirstPage = (args: Record<string, unknown>) =>
  !args.after && !args.before

export function addRun(
  cache: ApolloCache<unknown>,
  stackId: string,
  run: StackRunDeltaPayload
) {
  const node = cache.writeFragment({
    fragment: StackRunFragmentDoc,
    fragmentName: 'StackRun',
    data: run,
  })
  if (!node) return

  // runs are listed newest first
  const prepend: Modifier<Nullable<Connection>> = (
    existing,
    { storeFieldName, readField }
  ) => {
    const args = storeFieldArgs(storeFieldName)
    const edges = existing?.edges
    if (!edges || !isFirstPage(args)) return existing
    if (args.pullRequestId && args.pullRequestId !== run.pullRequest?.id)
      return existing
    if (edges.some((edge) => readField('id', edge?.node) === run.id))
      return existing

    return {
      ...existing,
      edges: [{ __typename: 'StackRunEdge', node }, ...edges],
    }
  }

  cache.modify({
    id: cache.identify({ __typename: 'InfrastructureStack', id: stackId }),
    fields: { runs: prepend } as Modifiers,
  })
}

export function addStack(cache: ApolloCache<unknown>, stack: StackListEntry) {
  const node = cache.writeFragment({
    fragment: StackTinyFragmentDoc,
    fragmentName: 'StackTiny',
    data: stack,
  })
  if (!node || !stack.id) return

  const insert: Modifier<Nullable<Connection>> = (
    existing,
    { storeFieldName, readField }
  ) => {
    const args = storeFieldArgs(storeFieldName)
    const edges = existing?.edges
    if (!edges || !isFirstPage(args) || args.q || args.tagQuery) return existing
    if (args.projectId && args.projectId !== stack.project?.id) return existing
    if (edges.some((edge) => readField('id', edge?.node) === stack.id))
      return existing

    // lists are sorted by name, so a stack after the last loaded one belongs
    // to a page that isn't loaded yet
    const index = edges.findIndex(
      (edge) =>
        stack.name.localeCompare(readField<string>('name', edge?.node) ?? '') <
        0
    )
    if (index < 0 && existing?.pageInfo?.hasNextPage) return existing
    const at = index < 0 ? edges.length : index

    return {
      ...existing,
      edges: [
        ...edges.slice(0, at),
        { __typename: 'InfrastructureStackEdge', node },
        ...edges.slice(at),
      ],
    }
  }

  cache.modify({
    id: 'ROOT_QUERY',
    fields: { infrastructureStacks: insert } as Modifiers,
  })
}

export function removeStack(cache: ApolloCache<unknown>, id: string) {
  const prune: Modifier<Nullable<Connection>> = (existing, { readField }) => {
    const edges = existing?.edges
    if (!edges) return existing

    const kept = edges.filter((edge) => readField('id', edge?.node) !== id)
    return kept.length === edges.length
      ? existing
      : { ...existing, edges: kept }
  }

  cache.modify({
    id: 'ROOT_QUERY',
    fields: { infrastructureStacks: prune } as Modifiers,
  })
  cache.evict({ id: cache.identify({ __typename: 'InfrastructureStack', id }) })
  cache.gc()
}
