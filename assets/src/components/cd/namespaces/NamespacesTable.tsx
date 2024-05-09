import { ComponentProps, useMemo } from 'react'
import { EmptyState, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { ManagedNamespace, useManagedNamespacesQuery } from 'generated/graphql'
import { getNamespacesDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'

import {
  NAMESPACES_QUERY_PAGE_SIZE,
  NAMESPACES_REACT_VIRTUAL_OPTIONS,
  columns,
} from './Namespaces'

export function NamespacesTable() {
  const theme = useTheme()
  const navigate = useNavigate()

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useManagedNamespacesQuery,
    pageSize: NAMESPACES_QUERY_PAGE_SIZE,
    queryKey: 'managedNamespaces',
  })

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        meta: {
          refetch,
        },
      }),
      [refetch]
    )

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      {!data ? (
        <LoadingIndicator />
      ) : !isEmpty(data?.managedNamespaces?.edges) ? (
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            data={data?.managedNamespaces?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            onRowClick={(_e, { original }: Row<Edge<ManagedNamespace>>) =>
              navigate(
                getNamespacesDetailsPath({
                  namespaceId: original.node?.id,
                })
              )
            }
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            reactTableOptions={reactTableOptions}
            reactVirtualOptions={NAMESPACES_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
          />
        </FullHeightTableWrap>
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="Looks like you don't have any namespaces yet." />
        </div>
      )}
    </div>
  )
}
