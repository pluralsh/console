import { ComponentProps, useMemo, useState } from 'react'
import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import type { TableState } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'

import {
  type ServiceDeploymentsRowFragment,
  useClusterProvidersQuery,
} from 'generated/graphql'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { CD_BASE_CRUMBS, useSetCDHeaderContent } from '../ContinuousDeployment'

import { ColName, ColProvider, getColActions } from './ProvidersColumns'
import { CreateProvider } from './CreateProvider'

const POLL_INTERVAL = 10 * 1000
const PROVIDERS_CRUMBS = [...CD_BASE_CRUMBS, { label: 'providers' }]

export type ServicesCluster = Exclude<
  ServiceDeploymentsRowFragment['cluster'],
  undefined | null
>

export default function Providers() {
  const theme = useTheme()
  const { data, error, refetch } = useClusterProvidersQuery({
    pollInterval: POLL_INTERVAL,
  })
  const columns = useMemo(
    () => [ColProvider, ColName, getColActions({ refetch })],
    [refetch]
  )

  useSetBreadcrumbs(PROVIDERS_CRUMBS)

  useSetCDHeaderContent(
    useMemo(() => <CreateProvider refetch={refetch} />, [refetch])
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
      }),
      [tableFilters]
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
        <FullHeightTableWrap>
          <Table
            data={data?.clusterProviders?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={reactTableOptions}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any providers yet." />
      )}
    </div>
  )
}
