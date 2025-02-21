import { EmptyState, Table } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useGroupsQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useContext, useMemo } from 'react'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'

import { GqlError } from 'components/utils/Alert'

import { LoginContext } from 'components/contexts'

import { GridTableWrapper } from 'components/utils/layout/ResponsiveGridLayouts'

import { Permissions, hasRbac } from '../misc'

import GroupCreate from './GroupCreate'
import { groupsColsEditable, groupsColsView } from './GroupsColumns'

export function GroupsList({ q }: any) {
  const { me } = useContext(LoginContext)
  const editable = !!me?.roles?.admin || hasRbac(me, Permissions.USERS)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useGroupsQuery,
        keyPath: ['groups'],
      },
      { q }
    )

  const groups = useMemo(
    () => data?.groups?.edges?.map((edge) => edge?.node),
    [data?.groups?.edges]
  )

  if (error) return <GqlError error={error} />
  if (!data?.groups?.edges) return <LoadingIndicator />

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] = {
    meta: { q, gridTemplateColumns: '1fr auto' },
  }

  return !isEmpty(groups) ? (
    <GridTableWrapper>
      <Table
        virtualizeRows
        rowBg="raised"
        data={groups || []}
        columns={editable ? groupsColsEditable : groupsColsView}
        hideHeader
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        reactTableOptions={reactTableOptions}
      />
    </GridTableWrapper>
  ) : (
    <EmptyState
      message={
        isEmpty(q)
          ? "Looks like you don't have any groups yet."
          : `No groups found for ${q}`
      }
    >
      <GroupCreate q={q} />
    </EmptyState>
  )
}
