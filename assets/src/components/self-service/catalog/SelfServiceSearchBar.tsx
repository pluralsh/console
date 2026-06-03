import {
  CatalogIcon,
  Chip,
  Flex,
  Input,
  MagnifyingGlassIcon,
  PrQueueIcon,
} from '@pluralsh/design-system'
import { CreatePrAutomation } from 'components/self-service/pr/automations/CreatePrAutomation'
import { Body2P } from 'components/utils/typography/Text'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { isEmpty } from 'lodash'
import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCatalogAbsPath } from 'routes/selfServiceRoutesConsts'
import { useTheme } from 'styled-components'
import { CatalogsSearchDropdownGroup } from './CatalogsSearchDropdownGroup'
import type {
  SearchDropdownItem,
  SelfServiceSearchState,
} from './useSelfServiceCatalogSearch'

export type { SearchDropdownItem }

export function SelfServiceSearchBar({
  aside,
  search,
  showCatalogGroup = true,
  showPrGroup = true,
}: {
  aside?: ReactNode
  search: SelfServiceSearchState
  showCatalogGroup?: boolean
  showPrGroup?: boolean
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [searchFocused, setSearchFocused] = useState(false)

  const {
    searchQuery,
    setSearchQuery,
    hasActiveSearch,
    showDropdown,
    isSearchPending,
    panelSearchError,
    panelCatalogItems,
    panelPrAutomationItems,
    semanticSearchEnabled,
  } = search

  const panelHasResults =
    !isEmpty(panelCatalogItems) || !isEmpty(panelPrAutomationItems)
  const showSearchDropdown = searchFocused && hasActiveSearch && showDropdown

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
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            showClearButton
            placeholder={
              semanticSearchEnabled
                ? 'Ask anything across service catalog and PR automations. Try "I want to create clusters."'
                : 'Search'
            }
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
              ) : panelSearchError ? (
                <GqlError error={panelSearchError} />
              ) : !panelHasResults ? (
                <Body2P
                  $color="text-xlight"
                  css={{
                    padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
                    textAlign: 'center',
                  }}
                >
                  No results found.
                </Body2P>
              ) : (
                <>
                  {showCatalogGroup && (
                    <CatalogsSearchDropdownGroup
                      label="Service catalog"
                      items={panelCatalogItems}
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
                      items={panelPrAutomationItems}
                      icon={<PrQueueIcon />}
                      renderRightContent={(item) => (
                        <CreatePrAutomation
                          id={item.id}
                          buttonProps={{ small: true }}
                          onOpen={() => setSearchFocused(false)}
                        />
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
    </>
  )
}
