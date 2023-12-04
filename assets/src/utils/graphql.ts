import isString from 'lodash/isString'
import uniqWith from 'lodash/uniqWith'

import { isNonNullable } from './isNonNullable'

export function updateFragment(cache, { fragment, id, update, fragmentName }) {
  const current = cache.readFragment({ id, fragment, fragmentName })

  if (!current) return

  cache.writeFragment({
    id,
    fragment,
    data: update(current),
    fragmentName,
  })
}

/**
 * Extend a connection where previous existing values are not overwritten by incoming values
 */
export function extendConnection<
  K extends string,
  TData extends Partial<
    Record<K, (Connection<any> & PaginatedResult<any>) | null>
  >,
>(prev: TData, next: TData[K] | null | undefined, key: K) {
  if (!next) {
    return prev
  }
  const { edges, pageInfo } = next
  const uniq = uniqWith(
    [...(prev[key]?.edges ?? []), ...(edges ?? [])],
    (a, b) => (a?.node?.id ? a?.node?.id === b?.node?.id : false)
  )

  return {
    ...prev,
    [key]: {
      ...prev[key],
      pageInfo,
      edges: uniq,
    },
  }
}

/**
 * Update a connection where incoming values overwrite previous existing values
 */
export function updateConnection<
  K extends string,
  TData extends Partial<
    Record<K, (Connection<any> & PaginatedResult<any>) | null>
  >,
>(prev: TData, next: TData[K] | null | undefined, key: K) {
  if (!next) {
    return prev
  }
  const { edges, pageInfo } = next

  const uniq = uniqWith(
    [...(prev[key]?.edges ?? []), ...(edges ?? [])].reverse(),
    (a, b) => (a?.node?.id ? a?.node?.id === b?.node?.id : false)
  ).reverse()

  return {
    ...prev,
    [key]: {
      ...prev[key],
      pageInfo,
      edges: uniq,
    },
  }
}

export function deepUpdate(prev, path, update, ind = 0) {
  if (isString(path)) {
    return deepUpdate(prev, path.split('.'), update, ind)
  }

  const key = path[ind]

  if (!path[ind + 1]) {
    return { ...prev, [key]: update(prev[key]) }
  }

  return {
    ...prev,
    [key]: deepUpdate(prev[key], path, update, ind + 1),
  }
}

export function appendConnection(prev, next, key) {
  const { edges, pageInfo } = prev[key]

  if (edges.find(({ node: { id } }) => id === next.id)) return prev

  return {
    ...prev,
    [key]: {
      ...prev[key],
      pageInfo,
      edges: [{ __typename: `${next.__typename}Edge`, node: next }, ...edges],
    },
  }
}

export function removeConnection(prev, val, key) {
  return {
    ...prev,
    [key]: {
      ...prev[key],
      edges: prev[key].edges.filter(({ node }) => node.id !== val.id),
    },
  }
}

export function updateCache(cache, { query, variables, update }: any) {
  const prev = cache.readQuery({ query, variables })

  cache.writeQuery({ query, variables, data: update(prev) })
}

// eslint-disable-next-line
export const prune = ({ __typename, ...rest }) => rest

export function deepFetch(map, path) {
  if (isString(path)) return deepFetch(map, path.split('.'))

  const key = path[0]

  if (!map) return null
  if (path.length === 1) return map[key]
  if (!map[key]) return null

  return deepFetch(map[key], path.slice(1))
}

export type Edge<N> = { node?: N | null }
export type Edges<N> = (Edge<N> | null)[]
export type Connection<N> = {
  edges?: Edges<N> | null
}
export type PaginatedResult<N> = Connection<N> & {
  pageInfo: { endCursor?: string | null | undefined; hasNextPage: boolean }
}

export function mapExistingNodes<N>(connection?: Connection<N> | null) {
  if (!connection?.edges) {
    return [] as N[]
  }
  const { edges } = connection

  return (edges || []).map((edge) => edge?.node).filter(isNonNullable)
}
