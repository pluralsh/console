import { ComponentProps, memo, useEffect, useMemo } from 'react'
import { Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import {
  type ServiceDeploymentsRowFragment,
  useGlobalServicesQuery,
} from 'generated/graphql'
import { getGlobalServiceDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { useProjectId } from 'components/contexts/ProjectsContext'

import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData'

import { columns } from './GlobalService'

function GlobalServicesTableComponent({
  setRefetch,
}: {
  setRefetch?: (refetch: () => () => void) => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const projectId = useProjectId()

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useGlobalServicesQuery,
      keyPath: ['globalServices'],
    },
    { projectId }
  )

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
      ) : (
        <Table
          fullHeightWrap
          virtualizeRows
          data={data?.globalServices?.edges || []}
          columns={columns}
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
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{
            message: "Looks like you don't have any service deployments yet.",
          }}
        />
      )}
    </div>
  )
}

export const GlobalServicesTable = memo(GlobalServicesTableComponent)
