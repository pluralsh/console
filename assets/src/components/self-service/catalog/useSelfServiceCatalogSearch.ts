import { useThrottle } from 'components/hooks/useThrottle'
import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext'
import {
  CatalogSearchItemFragment,
  PrAutomationSearchItemFragment,
  useCatalogSearchQuery,
} from 'generated/graphql'
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
    fetchPolicy: 'no-cache',
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

  const semanticCatalogs = useMemo(
    (): CatalogSearchItemFragment[] =>
      !useSemanticSearch
        ? []
        : chain(searchResults)
            .map(({ catalog }) => catalog)
            .filter(hasValue)
            .uniqBy('id')
            .value(),
    [searchResults, useSemanticSearch]
  )

  const semanticPrAutomations = useMemo(
    (): PrAutomationSearchItemFragment[] =>
      !useSemanticSearch
        ? []
        : chain(searchResults)
            .map(({ prAutomation }) => prAutomation)
            .filter(hasValue)
            .uniqBy('id')
            .value(),
    [searchResults, useSemanticSearch]
  )

  const panelCatalogItems = useMemo(
    (): SearchDropdownItem[] =>
      semanticCatalogs.map(
        ({ id, name, description, category, icon, darkIcon }) => ({
          id,
          name,
          description,
          category,
          icon,
          darkIcon,
        })
      ),
    [semanticCatalogs]
  )

  const panelPrAutomationItems = useMemo(
    (): SearchDropdownItem[] =>
      semanticPrAutomations.map(
        ({ id, name, documentation, icon, darkIcon }) => ({
          id,
          name,
          description: documentation,
          icon,
          darkIcon,
        })
      ),
    [semanticPrAutomations]
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
    }),
    [
      debouncedSearchQuery,
      error,
      hasActiveSearch,
      isSearchPending,
      panelCatalogItems,
      panelPrAutomationItems,
      searchQuery,
      semanticSearchEnabled,
      semanticSearchFailed,
      useFallbackSearch,
      useSemanticSearch,
    ]
  )
}
