import { Flex } from '@pluralsh/design-system'
import { GqlError, GqlErrorType } from 'components/utils/Alert'
import { DisplayFilterEmpty } from 'components/utils/display/DisplayPanel'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { WorkbenchSearchInput } from './WorkbenchSearchInput'

type SearchProps = {
  searchString: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
}

// The List and Board views of the workbench Jobs, Issues and Alerts tabs: the
// view (with a search field above it, unless searched from the header), or an
// error or the empty filter state instead.
export function WorkbenchMonitoringContent({
  search,
  error,
  filterEmptyKind,
  onResetFilters,
  minHeight = 160,
  compactTop = false,
  children,
}: {
  search?: SearchProps
  error: Nullable<GqlErrorType>
  // the filter with nothing selected, if any
  filterEmptyKind: Nullable<string>
  onResetFilters: () => void
  minHeight?: number
  // less space above views that start with their own header, e.g. grouped lists
  compactTop?: boolean
  children: ReactNode
}) {
  return (
    <WrapperSC
      $minHeight={minHeight}
      $compactTop={compactTop}
    >
      {search && (
        <WorkbenchSearchInput
          value={search.searchString}
          onChange={search.onSearchChange}
          placeholder={search.searchPlaceholder}
        />
      )}
      {error ? (
        <GqlError error={error} />
      ) : filterEmptyKind ? (
        <DisplayFilterEmpty
          title={`No ${filterEmptyKind} selected`}
          description={`It looks like there are no ${filterEmptyKind} selected.`}
          onReset={onResetFilters}
        />
      ) : (
        children
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled(Flex)<{ $minHeight: number; $compactTop: boolean }>(
  ({ theme, $minHeight, $compactTop }) => ({
    flexDirection: 'column',
    flex: 1,
    gap: theme.spacing.medium,
    minHeight: $minHeight,
    overflow: 'hidden',
    padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
    ...($compactTop && { paddingTop: theme.spacing.xxsmall }),
  })
)
