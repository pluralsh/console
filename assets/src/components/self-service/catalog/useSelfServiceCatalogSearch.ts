import { useThrottle } from 'components/hooks/useThrottle'
import { useAIEnabled } from 'components/contexts/DeploymentSettingsContext'
import { useCatalogSearchQuery } from 'generated/graphql'
import { chain, isEmpty } from 'lodash'
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

export type SelfServiceSearchBarState = {
  searchQuery: string
  setSearchQuery: (query: string) => void
  hasActiveSearch: boolean
  showSemanticPanel: boolean
  isPanelSearchPending: boolean
  semanticSearchEnabled: boolean
  panelSearchError?: GqlErrorType
  panelCatalogDropdownItems: SearchDropdownItem[]
  panelPrAutomationDropdownItems: SearchDropdownItem[]
  panelHasResults: boolean
}

function hasSearchValue<T>(value: Nullable<T> | undefined): value is T {
  return !!value
}

export function useSelfServiceCatalogSearch() {
  const aiEnabled = useAIEnabled()
  const [searchQuery, setSearchQuery] = useState('')
  const trimmedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useThrottle(trimmedSearchQuery, 300)
  const semanticSearchEnabled = aiEnabled === true

  const {
    data: catalogSearchData,
    error: catalogSearchError,
    loading: catalogSearchLoading,
  } = useCatalogSearchQuery({
    variables: { q: debouncedSearchQuery },
    skip: !debouncedSearchQuery || !semanticSearchEnabled,
  })

  const hasActiveSearch = !!trimmedSearchQuery
  const isSearchPending =
    semanticSearchEnabled &&
    hasActiveSearch &&
    (trimmedSearchQuery !== debouncedSearchQuery || catalogSearchLoading)
  const semanticSearchFailed =
    semanticSearchEnabled &&
    hasActiveSearch &&
    !isSearchPending &&
    !!catalogSearchError
  const useSemanticSearch =
    semanticSearchEnabled &&
    hasActiveSearch &&
    !isSearchPending &&
    !catalogSearchError
  const useExactSearch =
    hasActiveSearch &&
    !isSearchPending &&
    (!semanticSearchEnabled || semanticSearchFailed)

  const searchResults = useMemo(
    () => catalogSearchData?.catalogSearch?.filter(hasSearchValue) ?? [],
    [catalogSearchData?.catalogSearch]
  )

  const catalogIds = useMemo(
    () =>
      useSemanticSearch
        ? chain(searchResults)
            .map(({ catalog }) => catalog)
            .filter(hasSearchValue)
            .uniqBy('id')
            .map('id')
            .value()
        : [],
    [searchResults, useSemanticSearch]
  )

  const prAutomationIds = useMemo(
    () =>
      useSemanticSearch
        ? chain(searchResults)
            .map(({ prAutomation }) => prAutomation)
            .filter(hasSearchValue)
            .uniqBy('id')
            .map('id')
            .value()
        : [],
    [searchResults, useSemanticSearch]
  )

  const panelCatalogDropdownItems = useMemo((): SearchDropdownItem[] => {
    if (!useSemanticSearch) return []

    return chain(searchResults)
      .map(({ catalog }) => catalog)
      .filter(hasSearchValue)
      .uniqBy('id')
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        icon: item.icon,
        darkIcon: item.darkIcon,
      }))
      .value()
  }, [searchResults, useSemanticSearch])

  const panelPrAutomationDropdownItems = useMemo((): SearchDropdownItem[] => {
    if (!useSemanticSearch) return []

    return chain(searchResults)
      .map(({ prAutomation }) => prAutomation)
      .filter(hasSearchValue)
      .uniqBy('id')
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        icon: item.icon,
        darkIcon: item.darkIcon,
      }))
      .value()
  }, [searchResults, useSemanticSearch])

  const panelHasResults =
    !isEmpty(panelCatalogDropdownItems) ||
    !isEmpty(panelPrAutomationDropdownItems)
  const panelSearchError = semanticSearchFailed ? catalogSearchError : undefined
  const searchBar = useMemo(
    (): SelfServiceSearchBarState => ({
      searchQuery,
      setSearchQuery,
      hasActiveSearch,
      showSemanticPanel: semanticSearchEnabled,
      panelSearchError,
      isPanelSearchPending: isSearchPending,
      panelCatalogDropdownItems,
      panelPrAutomationDropdownItems,
      panelHasResults,
      semanticSearchEnabled,
    }),
    [
      hasActiveSearch,
      isSearchPending,
      panelCatalogDropdownItems,
      panelHasResults,
      panelPrAutomationDropdownItems,
      panelSearchError,
      searchQuery,
      semanticSearchEnabled,
    ]
  )

  return {
    searchQuery,
    setSearchQuery,
    trimmedSearchQuery,
    debouncedSearchQuery,
    hasActiveSearch,
    semanticSearchEnabled,
    isSearchPending,
    semanticSearchFailed,
    useSemanticSearch,
    useExactSearch,
    catalogIds,
    prAutomationIds,
    searchBar,
  }
}
