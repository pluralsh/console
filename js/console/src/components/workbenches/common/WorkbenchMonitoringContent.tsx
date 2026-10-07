import { Flex } from '@pluralsh/design-system'
import { GqlError, GqlErrorType } from 'components/utils/Alert'
import { DisplayFilterEmpty } from 'components/utils/display/DisplayPanel'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { WorkbenchSearchInput } from './WorkbenchSearchInput'

// The List and Board views of the workbench Jobs, Issues and Alerts tabs: the
// search field above the view, or an error or the empty filter state instead.
export function WorkbenchMonitoringContent({
  searchString,
  onSearchChange,
  searchPlaceholder,
  error,
  filterEmptyKind,
  onResetFilters,
  minHeight = 160,
  children,
}: {
  searchString: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  error: Nullable<GqlErrorType>
  // the filter with nothing selected, if any
  filterEmptyKind: Nullable<string>
  onResetFilters: () => void
  minHeight?: number
  children: ReactNode
}) {
  return (
    <WrapperSC $minHeight={minHeight}>
      <WorkbenchSearchInput
        value={searchString}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
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

const WrapperSC = styled(Flex)<{ $minHeight: number }>(
  ({ theme, $minHeight }) => ({
    flexDirection: 'column',
    flex: 1,
    gap: theme.spacing.medium,
    minHeight: $minHeight,
    overflow: 'hidden',
    padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  })
)
