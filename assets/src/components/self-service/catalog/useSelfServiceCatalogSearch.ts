import { useThrottle } from 'components/hooks/useThrottle'
import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext'
import { useCatalogSearchQuery } from 'generated/graphql'
import { chain } from 'lodash'
import { useMemo, useState } from 'react'
import type { GqlErrorType } from 'components/utils/Alert'

export type SearchDropdownItem = {
  id: string
  name: string
  description?: Nullable<string>
  category?: Nullable<string>
  icon?: Nullable<string>
  darkIcon?: Nullable<string>
}

export type SelfServiceSearchState = {
  searchQuery: string
  setSearchQuery: (query: string) => void
  debouncedSearchQuery: string
  hasActiveSearch: boolean
  semanticSearchEnabled: boolean
  isSearchPending: boolean
  useSemanticSearch: boolean
  useFallbackSearch: boolean
  showDropdown: boolean // Show it only when AI is active and hasn't failed
  panelSearchError?: GqlErrorType
  panelCatalogItems: SearchDropdownItem[]
  panelPrAutomationItems: SearchDropdownItem[]
  catalogIds: string[]
  prAutomationIds: string[]
}

function hasValue<T>(value: Nullable<T> | undefined): value is T {
  return !!value
}

export function useSelfServiceCatalogSearch(): SelfServiceSearchState {
  const aiEnabled = useAIEnabled()
  const [searchQuery, setSearchQuery] = useState('')
  const trimmedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useThrottle(trimmedSearchQuery, 300)
  const semanticSearchEnabled = aiEnabled === true

  const { data, error, loading } = useCatalogSearchQuery({
    variables: { q: debouncedSearchQuery },
    skip: !debouncedSearchQuery || !semanticSearchEnabled,
  })

  const hasActiveSearch = !!trimmedSearchQuery
  const isSearchPending =
    semanticSearchEnabled &&
    hasActiveSearch &&
    (trimmedSearchQuery !== debouncedSearchQuery || loading)
  const semanticSearchFailed =
    semanticSearchEnabled && hasActiveSearch && !isSearchPending && !!error
  const useSemanticSearch =
    semanticSearchEnabled && hasActiveSearch && !isSearchPending && !error
  const useFallbackSearch =
    hasActiveSearch &&
    !isSearchPending &&
    (!semanticSearchEnabled || semanticSearchFailed)

  const searchResults = useMemo(
    () => data?.catalogSearch?.filter(hasValue) ?? [],
    [data?.catalogSearch]
  )

  const panelCatalogItems = useMemo(
    (): SearchDropdownItem[] =>
      !useSemanticSearch
        ? []
        : chain(searchResults)
            .map(({ catalog }) => catalog)
            .filter(hasValue)
            .uniqBy('id')
            .map(({ id, name, description, category, icon, darkIcon }) => ({
              id,
              name,
              description,
              category,
              icon,
              darkIcon,
            }))
            .value(),
    [searchResults, useSemanticSearch]
  )

  const panelPrAutomationItems = useMemo(
    (): SearchDropdownItem[] =>
      !useSemanticSearch
        ? []
        : chain(searchResults)
            .map(({ prAutomation }) => prAutomation)
            .filter(hasValue)
            .uniqBy('id')
            .map(({ id, name, description, icon, darkIcon }) => ({
              id,
              name,
              description,
              icon,
              darkIcon,
            }))
            .value(),
    [searchResults, useSemanticSearch]
  )

  const catalogIds = useMemo(
    () => panelCatalogItems.map(({ id }) => id),
    [panelCatalogItems]
  )

  const prAutomationIds = useMemo(
    () => panelPrAutomationItems.map(({ id }) => id),
    [panelPrAutomationItems]
  )

  return useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      debouncedSearchQuery,
      hasActiveSearch,
      semanticSearchEnabled,
      isSearchPending,
      useSemanticSearch,
      useFallbackSearch,
      showDropdown: semanticSearchEnabled && !semanticSearchFailed,
      panelSearchError: semanticSearchFailed ? error : undefined,
      panelCatalogItems,
      panelPrAutomationItems,
      catalogIds,
      prAutomationIds,
    }),
    [
      catalogIds,
      debouncedSearchQuery,
      error,
      hasActiveSearch,
      isSearchPending,
      panelCatalogItems,
      panelPrAutomationItems,
      prAutomationIds,
      searchQuery,
      semanticSearchEnabled,
      semanticSearchFailed,
      useFallbackSearch,
      useSemanticSearch,
    ]
  )
}
