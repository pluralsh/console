import { useThrottle } from 'components/hooks/useThrottle'
import { CatalogFragment, useCatalogSearchQuery } from 'generated/graphql'
import { chain, keyBy } from 'lodash'
import { useMemo } from 'react'
import {
  catalogSearchItemToDropdownItem,
  hasSearchValue,
  prSearchItemToDropdownItem,
} from './selfServiceSearch'

const emptyCatalogs: CatalogFragment[] = []

export function useSelfServiceSearch({
  searchQuery,
  catalogs = emptyCatalogs,
}: {
  searchQuery: string
  catalogs?: CatalogFragment[]
}) {
  const debouncedQuery = useThrottle(searchQuery, 300)

  const {
    data: catalogSearchData,
    error: catalogSearchError,
    loading: catalogSearchLoading,
  } = useCatalogSearchQuery({
    variables: { q: debouncedQuery },
    skip: !debouncedQuery,
  })

  const catalogsById = useMemo(() => keyBy(catalogs, 'id'), [catalogs])
  const hasActiveSearch = !!searchQuery
  const isPanelSearchPending =
    hasActiveSearch && (searchQuery !== debouncedQuery || catalogSearchLoading)
  const panelSearchError =
    hasActiveSearch && catalogSearchError && !isPanelSearchPending
      ? catalogSearchError
      : undefined

  const searchResults = useMemo(
    () => catalogSearchData?.catalogSearch?.filter(hasSearchValue) ?? [],
    [catalogSearchData?.catalogSearch]
  )

  const catalogSearchItems = useMemo(
    () =>
      chain(searchResults)
        .map(({ catalog }) => catalog)
        .filter(hasSearchValue)
        .uniqBy('id')
        .value(),
    [searchResults]
  )

  const prAutomationSearchItems = useMemo(
    () =>
      chain(searchResults)
        .map(({ prAutomation }) => prAutomation)
        .filter(hasSearchValue)
        .uniqBy('id')
        .value(),
    [searchResults]
  )

  const panelCatalogDropdownItems = useMemo(() => {
    if (isPanelSearchPending || panelSearchError) return []

    return catalogSearchItems.map((item) =>
      catalogSearchItemToDropdownItem(item, catalogsById)
    )
  }, [catalogSearchItems, catalogsById, isPanelSearchPending, panelSearchError])

  const panelPrAutomationDropdownItems = useMemo(() => {
    if (isPanelSearchPending || panelSearchError) return []

    return prAutomationSearchItems.map(prSearchItemToDropdownItem)
  }, [isPanelSearchPending, panelSearchError, prAutomationSearchItems])

  return {
    searchQuery,
    debouncedQuery,
    hasActiveSearch,
    isPanelSearchPending,
    panelSearchError,
    panelCatalogDropdownItems,
    panelPrAutomationDropdownItems,
    catalogsById,
  }
}
