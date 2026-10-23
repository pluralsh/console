import usePersistedState from 'components/hooks/usePersistedState'
import {
  DisplayView,
  toggleListValue,
} from 'components/utils/display/DisplayPanel'
import { SortDirection, WorkbenchSort } from 'generated/graphql'
import { useCallback } from 'react'

export const WORKBENCHES_VIEW_STORAGE_KEY = 'workbenches-view'
export const WORKBENCHES_FAVORITES_STORAGE_KEY = 'workbenches-favorites'

export type WorkbenchesDisplayState = {
  view: DisplayView
  sort: WorkbenchSort
  direction: SortDirection
}

export const DEFAULT_WORKBENCHES_DISPLAY: WorkbenchesDisplayState = {
  view: 'board',
  sort: WorkbenchSort.Name,
  direction: SortDirection.Asc,
}

export function toWorkbenchSortVariables(
  { sort, direction }: WorkbenchesDisplayState,
  favoriteIds: string[]
): {
  sort?: WorkbenchSort
  direction?: SortDirection
  favoriteIds?: string[]
} {
  const defaultSort =
    sort === WorkbenchSort.Name && direction === SortDirection.Asc

  return {
    sort: defaultSort ? undefined : sort,
    direction: defaultSort ? undefined : direction,
    favoriteIds: sort === WorkbenchSort.Favorited ? favoriteIds : undefined,
  }
}

function parseFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string')
}

const NO_FAVORITES: string[] = []

// usePersistedState doesn't sync across instances, so call this once per page
// and pass the result down to cards and rows.
export function useWorkbenchFavorites() {
  const [favoriteIds, setFavoriteIds] = usePersistedState(
    WORKBENCHES_FAVORITES_STORAGE_KEY,
    NO_FAVORITES,
    0,
    parseFavoriteIds
  )
  const toggleFavorite = useCallback(
    (id: string) => setFavoriteIds((ids) => toggleListValue(ids, id)),
    [setFavoriteIds]
  )

  return { favoriteIds, toggleFavorite }
}
