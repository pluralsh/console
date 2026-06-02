import {
  Button,
  Card,
  CatalogIcon,
  Chip,
  CloseIcon,
  EmptyState,
  FiltersIcon,
  Flex,
  Input,
  MagnifyingGlassIcon,
  PrQueueIcon,
} from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import { CreatePrModal } from 'components/self-service/pr/automations/CreatePrModal'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import Fuse from 'fuse.js'
import {
  CatalogFragment,
  CatalogSearchItem,
  PrAutomationFragment,
  PrAutomationSearchItem,
  useCatalogSearchQuery,
  useCatalogsQuery,
  usePrAutomationLazyQuery,
} from 'generated/graphql'
import { chain, compact, countBy, isEmpty, keyBy } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCatalogAbsPath } from 'routes/selfServiceRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { CatalogsFilters } from './CatalogsFilters'
import { CardGridSkeleton, CatalogsGrid } from './CatalogsGrid'
import { CatalogsSearchDropdownGroup } from './CatalogsSearchDropdownGroup'

const searchOptions = {
  keys: ['name', 'description', 'category'],
  threshold: 0.25,
}

export type SearchDropdownItem = {
  id: string
  name: string
  description?: Nullable<string>
  icon?: Nullable<string>
  darkIcon?: Nullable<string>
}

type CatalogFilterKey = 'author' | 'category'

function hasValue<T>(value: Nullable<T> | undefined): value is T {
  return !!value
}

function getCatalogFilters(
  catalogs: ReturnType<typeof mapExistingNodes>,
  filterKey: CatalogFilterKey
) {
  return chain(catalogs)
    .map(filterKey)
    .compact()
    .thru(countBy)
    .map((items, key) => ({ key, items }))
    .value()
}

function matchesCatalogFilters({
  author,
  authorFilters,
  category,
  categoryFilters,
}: {
  author?: Nullable<string>
  authorFilters: string[]
  category?: Nullable<string>
  categoryFilters: string[]
}) {
  if (!isEmpty(authorFilters) && (!author || !authorFilters.includes(author))) {
    return false
  }

  if (
    !isEmpty(categoryFilters) &&
    (!category || !categoryFilters.includes(category))
  ) {
    return false
  }

  return true
}

function catalogToSearchDropdownItem({
  id,
  name,
  description,
  icon,
  darkIcon,
}: Pick<
  CatalogFragment,
  'id' | 'name' | 'description' | 'icon' | 'darkIcon'
>): SearchDropdownItem {
  return {
    id,
    name,
    description: description ?? undefined,
    icon,
    darkIcon,
  }
}

function catalogSearchItemToDropdownItem(
  item: CatalogSearchItem,
  catalogsById: Record<string, CatalogFragment>
): SearchDropdownItem {
  const catalog = catalogsById[item.id]

  return {
    id: item.id,
    name: item.name,
    description: catalog?.description ?? item.documentation ?? undefined,
    icon: catalog?.icon ?? item.icon,
    darkIcon: catalog?.darkIcon ?? item.darkIcon,
  }
}

function prSearchItemToDropdownItem(
  item: PrAutomationSearchItem
): SearchDropdownItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    icon: item.icon,
    darkIcon: item.darkIcon,
  }
}

export function Catalogs() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const searchQuery = query.trim()
  const debouncedQuery = useThrottle(searchQuery, 300)
  const [searchFocused, setSearchFocused] = useState(false)
  const [createPrAutomation, setCreatePrAutomation] =
    useState<Nullable<PrAutomationFragment>>(null)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [authorFilters, setAuthorFilters] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([])

  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useCatalogsQuery,
      keyPath: ['catalogs'],
    })

  const {
    data: catalogSearchData,
    error: catalogSearchError,
    loading: catalogSearchLoading,
  } = useCatalogSearchQuery({
    variables: { q: debouncedQuery },
    skip: !debouncedQuery,
  })

  const [fetchPrAutomation] = usePrAutomationLazyQuery()
  const [openingPrAutomationId, setOpeningPrAutomationId] =
    useState<Nullable<string>>(null)

  const catalogs = useMemo(
    () => mapExistingNodes(data?.catalogs),
    [data?.catalogs]
  )
  const catalogsById = useMemo(() => keyBy(catalogs, 'id'), [catalogs])

  const hasActiveSearch = !!searchQuery
  const isSearchPending =
    hasActiveSearch && (searchQuery !== debouncedQuery || catalogSearchLoading)
  const useFuseFallback =
    hasActiveSearch && !!catalogSearchError && !isSearchPending

  const fuseSearchCatalogs = useMemo(() => {
    if (!useFuseFallback) return []

    const fuse = new Fuse(catalogs, searchOptions)
    return fuse.search(searchQuery).map(({ item }) => item)
  }, [catalogs, searchQuery, useFuseFallback])

  const searchResults = useMemo(
    () => catalogSearchData?.catalogSearch?.filter(hasValue) ?? [],
    [catalogSearchData?.catalogSearch]
  )

  const catalogSearchItems = useMemo(
    () =>
      chain(searchResults)
        .map(({ catalog }) => catalog)
        .filter(hasValue)
        .uniqBy('id')
        .value(),
    [searchResults]
  )

  const prAutomationSearchItems = useMemo(
    () =>
      chain(searchResults)
        .map(({ prAutomation }) => prAutomation)
        .filter(hasValue)
        .uniqBy('id')
        .value(),
    [searchResults]
  )

  const searchResultCatalogs = useMemo(() => {
    if (!hasActiveSearch) return catalogs
    if (isSearchPending) return []
    if (useFuseFallback) return fuseSearchCatalogs

    if (catalogSearchItems.length > 0) {
      return compact(catalogSearchItems.map(({ id }) => catalogsById[id]))
    }

    return []
  }, [
    catalogSearchItems,
    catalogs,
    catalogsById,
    fuseSearchCatalogs,
    hasActiveSearch,
    isSearchPending,
    useFuseFallback,
  ])

  const filterCatalogs =
    hasActiveSearch && !isSearchPending ? searchResultCatalogs : catalogs

  const authors = useMemo(
    () => getCatalogFilters(filterCatalogs, 'author'),
    [filterCatalogs]
  )

  const categories = useMemo(
    () => getCatalogFilters(filterCatalogs, 'category'),
    [filterCatalogs]
  )

  const resetFilters = useCallback(() => {
    setAuthorFilters([])
    setCategoryFilters([])
  }, [])

  const hasActiveFilters = !isEmpty(authorFilters) || !isEmpty(categoryFilters)

  const displayCatalogs = useMemo(
    () =>
      filterCatalogs.filter(({ author, category }) =>
        matchesCatalogFilters({
          author,
          authorFilters,
          category,
          categoryFilters,
        })
      ),
    [authorFilters, categoryFilters, filterCatalogs]
  )

  const catalogDropdownItems = useMemo(() => {
    if (useFuseFallback)
      return fuseSearchCatalogs.map(catalogToSearchDropdownItem)

    return catalogSearchItems.map((item) =>
      catalogSearchItemToDropdownItem(item, catalogsById)
    )
  }, [catalogSearchItems, catalogsById, fuseSearchCatalogs, useFuseFallback])

  const prAutomationDropdownItems = useMemo(
    () => prAutomationSearchItems.map(prSearchItemToDropdownItem),
    [prAutomationSearchItems]
  )

  const showSearchDropdown =
    searchFocused &&
    hasActiveSearch &&
    (isSearchPending ||
      catalogDropdownItems.length > 0 ||
      prAutomationDropdownItems.length > 0)

  const clearSearch = useCallback(() => setQuery(''), [])

  const openPrAutomation = useCallback(
    async (id: string) => {
      setOpeningPrAutomationId(id)

      try {
        const result = await fetchPrAutomation({ variables: { id } })
        const prAutomation = result.data?.prAutomation

        if (prAutomation) setCreatePrAutomation(prAutomation)
      } finally {
        setOpeningPrAutomationId(null)
      }
    },
    [fetchPrAutomation]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      css={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        gap: theme.spacing.large,
      }}
    >
      <Flex
        direction="column"
        grow={1}
        height="100%"
        overflow="hidden"
        gap="medium"
      >
        <Flex
          gap="medium"
          width="100%"
          justify="space-between"
        >
          <div
            css={{
              flexGrow: 1,
              position: 'relative',
            }}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              showClearButton
              placeholder='Ask anything across service catalog and PR automations. Try "I want to create clusters."'
              startIcon={<MagnifyingGlassIcon color="icon-light" />}
              width="100%"
            />
            {showSearchDropdown && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                css={{
                  background: theme.colors['fill-one'],
                  border: theme.borders['fill-two'],
                  borderRadius: theme.borderRadiuses.medium,
                  boxShadow: theme.boxShadows.moderate,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.small,
                  left: 0,
                  maxHeight: 500,
                  overflowY: 'auto',
                  padding: theme.spacing.small,
                  position: 'absolute',
                  right: 0,
                  top: `calc(100% + ${theme.spacing.xxsmall}px)`,
                  zIndex: theme.zIndexes.selectPopover,
                }}
              >
                {isSearchPending ? (
                  <RectangleSkeleton
                    $height={56}
                    $width="100%"
                  />
                ) : (
                  <>
                    <CatalogsSearchDropdownGroup
                      label="Service catalog"
                      items={catalogDropdownItems}
                      icon={<CatalogIcon />}
                      clickable
                      onClick={(item) => {
                        setSearchFocused(false)
                        navigate(getCatalogAbsPath(item.id))
                      }}
                      renderRightContent={(item) => {
                        const category = catalogsById[item.id]?.category
                        return category && <Chip size="small">{category}</Chip>
                      }}
                    />
                    <CatalogsSearchDropdownGroup
                      label="PR automations"
                      items={prAutomationDropdownItems}
                      icon={<PrQueueIcon />}
                      renderRightContent={(item) => (
                        <Button
                          secondary
                          small
                          loading={openingPrAutomationId === item.id}
                          onClick={() => {
                            setSearchFocused(false)
                            openPrAutomation(item.id)
                          }}
                        >
                          Create PR
                        </Button>
                      )}
                    />
                  </>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={() =>
              hasActiveFilters
                ? resetFilters()
                : setFiltersVisible(!filtersVisible)
            }
            secondary
            startIcon={hasActiveFilters ? <CloseIcon /> : <FiltersIcon />}
            style={{
              borderColor: hasActiveFilters
                ? theme.colors['border-primary']
                : undefined,
            }}
          >
            {hasActiveFilters ? 'Reset filters' : 'Filters'}
          </Button>
        </Flex>
        {hasActiveSearch && isSearchPending ? (
          <CardGridSkeleton count={3} />
        ) : (
          <CatalogsGrid
            catalogs={displayCatalogs}
            onBottomReached={() => {
              if (!hasActiveSearch && !loading && pageInfo?.hasNextPage) {
                fetchNextPage()
              }
            }}
            loading={!hasActiveSearch && loading}
            emptyState={
              <Card
                css={{
                  flexGrow: 1,
                  padding: theme.spacing.xxlarge,
                  ...(theme.mode === 'light' && {
                    backgroundColor: theme.colors['fill-zero'],
                  }),
                }}
              >
                <EmptyState
                  message={
                    hasActiveFilters || hasActiveSearch
                      ? 'There are no results with these filters.'
                      : 'There are no catalogs available.'
                  }
                >
                  {(hasActiveFilters || hasActiveSearch) && (
                    <Button
                      secondary
                      onClick={() => {
                        resetFilters()
                        clearSearch()
                      }}
                    >
                      Reset filters
                    </Button>
                  )}
                </EmptyState>
              </Card>
            }
          />
        )}
      </Flex>
      {filtersVisible && (
        <CatalogsFilters
          authors={authors}
          authorFilters={authorFilters}
          setAuthorFilters={setAuthorFilters}
          categories={categories}
          categoryFilters={categoryFilters}
          setCategoryFilters={setCategoryFilters}
        />
      )}
      {createPrAutomation && (
        <CreatePrModal
          prAutomation={createPrAutomation}
          open
          onClose={() => setCreatePrAutomation(null)}
        />
      )}
    </Flex>
  )
}
