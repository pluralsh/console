import {
  Button,
  CatalogIcon,
  Chip,
  Flex,
  Input,
  MagnifyingGlassIcon,
  PrQueueIcon,
} from '@pluralsh/design-system'
import { CreatePrModal } from 'components/self-service/pr/automations/CreatePrModal'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  PrAutomationFragment,
  useCatalogSearchQuery,
  usePrAutomationLazyQuery,
} from 'generated/graphql'
import { chain } from 'lodash'
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCatalogAbsPath } from 'routes/selfServiceRoutesConsts'
import { useTheme } from 'styled-components'
import { CatalogsSearchDropdownGroup } from './CatalogsSearchDropdownGroup'

const selfServiceSearchPlaceholder =
  'Ask anything across service catalog and PR automations. Try "I want to create clusters."'

export type SearchDropdownItem = {
  id: string
  name: string
  description?: Nullable<string>
  category?: Nullable<string>
  icon?: Nullable<string>
  darkIcon?: Nullable<string>
}

function hasSearchValue<T>(value: Nullable<T> | undefined): value is T {
  return !!value
}

export function SelfServiceSearchBar({
  aside,
  searchQuery,
  onSearchQueryChange,
  showCatalogGroup = true,
  showPrGroup = true,
}: {
  aside?: ReactNode
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  showCatalogGroup?: boolean
  showPrGroup?: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const trimmedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useThrottle(trimmedSearchQuery, 300)
  const [searchFocused, setSearchFocused] = useState(false)
  const [createPrAutomation, setCreatePrAutomation] =
    useState<Nullable<PrAutomationFragment>>(null)
  const [openingPrAutomationId, setOpeningPrAutomationId] =
    useState<Nullable<string>>(null)
  const openingPrAutomationIdRef = useRef<Nullable<string>>(null)
  const [fetchPrAutomation] = usePrAutomationLazyQuery()

  const {
    data: catalogSearchData,
    error: catalogSearchError,
    loading: catalogSearchLoading,
  } = useCatalogSearchQuery({
    variables: { q: debouncedSearchQuery },
    skip: !debouncedSearchQuery,
  })

  const hasActiveSearch = !!trimmedSearchQuery
  const isPanelSearchPending =
    hasActiveSearch &&
    (trimmedSearchQuery !== debouncedSearchQuery || catalogSearchLoading)
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

    return catalogSearchItems.map((item) => {
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        icon: item.icon,
        darkIcon: item.darkIcon,
      }
    })
  }, [catalogSearchItems, isPanelSearchPending, panelSearchError])

  const panelPrAutomationDropdownItems = useMemo(() => {
    if (isPanelSearchPending || panelSearchError) return []

    return prAutomationSearchItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      darkIcon: item.darkIcon,
    }))
  }, [isPanelSearchPending, panelSearchError, prAutomationSearchItems])

  const showSearchDropdown = searchFocused && hasActiveSearch

  const openPrAutomation = useCallback(
    async (id: string) => {
      openingPrAutomationIdRef.current = id
      setOpeningPrAutomationId(id)

      try {
        const result = await fetchPrAutomation({ variables: { id } })
        if (openingPrAutomationIdRef.current !== id) return

        const prAutomation = result.data?.prAutomation
        if (prAutomation) setCreatePrAutomation(prAutomation)
      } finally {
        if (openingPrAutomationIdRef.current === id) {
          openingPrAutomationIdRef.current = null
          setOpeningPrAutomationId(null)
        }
      }
    },
    [fetchPrAutomation]
  )

  return (
    <>
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
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            showClearButton
            placeholder={selfServiceSearchPlaceholder}
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
              {isPanelSearchPending ? (
                <RectangleSkeleton
                  $height={56}
                  $width="100%"
                />
              ) : panelSearchError ? (
                <GqlError error={panelSearchError} />
              ) : (
                <>
                  {showCatalogGroup && (
                    <CatalogsSearchDropdownGroup
                      label="Service catalog"
                      items={panelCatalogDropdownItems}
                      icon={<CatalogIcon />}
                      clickable
                      onClick={(item) => {
                        setSearchFocused(false)
                        navigate(getCatalogAbsPath(item.id))
                      }}
                      renderRightContent={(item) => {
                        return (
                          item.category && (
                            <Chip size="small">{item.category}</Chip>
                          )
                        )
                      }}
                    />
                  )}
                  {showPrGroup && (
                    <CatalogsSearchDropdownGroup
                      label="PR automations"
                      items={panelPrAutomationDropdownItems}
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
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {aside}
      </Flex>
      {createPrAutomation && (
        <CreatePrModal
          prAutomation={createPrAutomation}
          open
          onClose={() => setCreatePrAutomation(null)}
        />
      )}
    </>
  )
}
