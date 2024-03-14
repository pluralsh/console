import uniqWith from 'lodash/uniqWith'

import { Types_ListMeta as ListMetaT } from '../../generated/graphql-kubernetes'

// TODO: Use generic types.

export const ITEMS_PER_PAGE = 25

export const DEFAULT_DATA_SELECT = {
  itemsPerPage: `${ITEMS_PER_PAGE}`,
  page: '1',
}

export function usePageInfo(items: any[], listMeta: ListMetaT | undefined) {
  const totalItems = listMeta?.totalItems ?? 0
  const pages = Math.ceil(totalItems / ITEMS_PER_PAGE)
  const page = Math.ceil(items.length / ITEMS_PER_PAGE)
  const hasNextPage = page < pages

  return { page, hasNextPage }
}

export function extendConnection(
  prev: any,
  next: any,
  query: string,
  key: string
) {
  if (!next) {
    return prev
  }

  const uniq = uniqWith(
    [...(prev[query]?.[key] ?? []), ...(next[query]?.[key] ?? [])],
    (a, b) =>
      a?.objectMeta.uid ? a?.objectMeta.uid === b?.objectMeta.uid : false
  )

  return {
    [query]: {
      ...prev[query],
      [key]: uniq,
    },
  }
}
