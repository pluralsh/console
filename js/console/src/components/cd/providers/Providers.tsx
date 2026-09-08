import { ComponentProps, useMemo, useState } from 'react'
import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import type { TableState } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useClusterProvidersQuery } from 'generated/graphql'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { mapExistingNodes } from 'utils/graphql'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { ColActions, ColName, ColProvider } from './ProvidersColumns'
import { CreateProvider } from './CreateProvider'

const POLL_INTERVAL = 10 * 1000
const PROVIDERS_CRUMBS = [...CD_BASE_CRUMBS, { label: 'providers' }]

const columns = [ColProvider, ColName, ColActions]

export default function Providers() {
  const theme = useTheme()
  const { data, error, refetch } = useClusterProvidersQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  useSetBreadcrumbs(PROVIDERS_CRUMBS)

  useSetPageHeaderContent(
    useMemo(
      () => (
        <CreateProvider
          refetch={refetch}
          providers={mapExistingNodes(data?.clusterProviders)}
        />
      ),
      [data?.clusterProviders, refetch]
    )
  )
  const [tableFilters, _] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          ...tableFilters,
        },
        meta: { refetch },
      }),
      [tableFilters, refetch]
    )

  if (error) {
    return <EmptyState message="Looks like you don't have any providers yet." />
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
      {!isEmpty(data?.clusterProviders?.edges) ? (
        <Table
          fullHeightWrap
          data={data?.clusterProviders?.edges || []}
          columns={columns}
          reactTableOptions={reactTableOptions}
        />
      ) : (
        <EmptyState message="Looks like you don't have any providers yet." />
      )}
    </div>
  )
}
