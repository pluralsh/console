import { ComponentProps, useEffect, useMemo } from 'react'
import { EmptyState, Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import {
  type ServiceDeploymentsRowFragment,
  useGetGlobalServicesQuery,
} from 'generated/graphql'
import { getGlobalServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { useFetchPaginatedData } from '../utils/useFetchPaginatedData'

import {
  GLOBAL_SERVICES_QUERY_PAGE_SIZE,
  GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS,
  columns,
} from './GlobalService'

export function GlobalServicesTable({
  setRefetch,
}: {
  setRefetch?: (refetch: () => () => void) => void
}) {
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
    queryHook: useGetGlobalServicesQuery,
    pageSize: GLOBAL_SERVICES_QUERY_PAGE_SIZE,
    queryKey: 'globalServices',
  })

  useEffect(() => {
    setRefetch?.(() => refetch)
  }, [refetch, setRefetch])

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
      ) : !isEmpty(data?.globalServices?.edges) ? (
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            data={data?.globalServices?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            onRowClick={(
              _e,
              { original }: Row<Edge<ServiceDeploymentsRowFragment>>
            ) =>
              navigate(
                getGlobalServiceDetailsPath({
                  serviceId: original.node?.id,
                })
              )
            }
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            reactTableOptions={reactTableOptions}
            reactVirtualOptions={GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
          />
        </FullHeightTableWrap>
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="Looks like you don't have any service deployments yet." />
        </div>
      )}
    </div>
  )
}
