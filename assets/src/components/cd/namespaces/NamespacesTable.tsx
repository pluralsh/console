import { ComponentProps, useMemo } from 'react'
import { Table } from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row } from '@tanstack/react-table'
import { ManagedNamespace, useManagedNamespacesQuery } from 'generated/graphql'
import { getNamespacesDetailsPath } from 'routes/cdRoutesConsts'
import { Edge } from 'utils/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { useProjectId } from 'components/contexts/ProjectsContext'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

import { columns } from './Namespaces'

export function NamespacesTable() {
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
      queryHook: useManagedNamespacesQuery,
      keyPath: ['managedNamespaces'],
    },
    { projectId }
  )

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
          data={data?.managedNamespaces?.edges || []}
          columns={columns}
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
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{
            message: "Looks like you don't have any namespaces yet",
          }}
        />
      )}
    </div>
  )
}
