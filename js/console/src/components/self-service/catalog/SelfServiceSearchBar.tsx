import {
  CatalogIcon,
  Chip,
  Input,
  MagnifyingGlassIcon,
  PrQueueIcon,
} from '@pluralsh/design-system'
import { CreatePrAutomation } from 'components/self-service/pr/automations/CreatePrAutomation'
import { Body2P } from 'components/utils/typography/Text'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCatalogAbsPath } from 'routes/selfServiceRoutesConsts'
import { useTheme } from 'styled-components'
import { SelfServiceSearchDropdownGroup } from './SelfServiceSearchDropdownGroup'
import type {
  SearchDropdownItem,
  SelfServiceSearchState,
} from './useSelfServiceCatalogSearch'

export type { SearchDropdownItem }

const SEARCH_WIDTH = 240
const SEARCH_EXPANDED_WIDTH = 520

// sized for a page toolbar: small until focused, then wide enough for the
// semantic search prompt and its results
export function SelfServiceSearchBar({
  search,
  showCatalogGroup = true,
  showPrGroup = true,
}: {
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
    panelCatalogItems,
    panelPrAutomationItems,
    semanticSearchEnabled,
  } = search

  const panelHasResults =
    !isEmpty(panelCatalogItems) || !isEmpty(panelPrAutomationItems)
  const showSearchDropdown = searchFocused && hasActiveSearch && showDropdown

  return (
    <div
      css={{
        flexShrink: 1,
        minWidth: 140,
        position: 'relative',
        transition: 'width 200ms ease',
        width: searchFocused ? SEARCH_EXPANDED_WIDTH : SEARCH_WIDTH,
      }}
    >
      <Input
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        showClearButton
        placeholder={
          !semanticSearchEnabled
            ? 'Search'
            : searchFocused
              ? 'Ask anything across service catalog and PR automations. Try "I want to create clusters."'
              : 'Search or ask anything'
        }
        startIcon={
          <MagnifyingGlassIcon
            size={12}
            color="icon-light"
          />
        }
        css={{ width: '100%' }}
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
                <SelfServiceSearchDropdownGroup
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
                      item.category && <Chip size="small">{item.category}</Chip>
                    )
                  }}
                />
              )}
              {showPrGroup && (
                <SelfServiceSearchDropdownGroup
                  label="PR automations"
                  items={panelPrAutomationItems}
                  icon={<PrQueueIcon />}
                  renderRightContent={(item) => (
                    <CreatePrAutomation
                      id={item.id}
                      buttonProps={{ small: true }}
                    />
                  )}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
