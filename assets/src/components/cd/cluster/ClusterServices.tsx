import { useParams } from 'react-router-dom'
import { ComponentProps, useMemo, useState } from 'react'
import isEmpty from 'lodash/isEmpty'
import { EmptyState, Table } from '@pluralsh/design-system'
import { Row, TableState } from '@tanstack/react-table'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'

import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

import { useDebounce } from '@react-hooks-library/core'

import {
  ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from '../../../generated/graphql'
import {
  ColActions,
  ColCluster,
  ColErrors,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
} from '../services/ServicesColumns'
import { FullHeightTableWrap } from '../../utils/layout/FullHeightTableWrap'
import { Edge } from '../../../utils/graphql'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ServicesFilters } from '../services/ServicesFilters'
import { DeployService } from '../services/deployModal/DeployService'

const POLL_INTERVAL = 10 * 1000

const columns = [
  ColServiceDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
  ColActions,
]

export default function ClusterServices() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { clusterId } = useParams()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)
  const { data, error, refetch } = useServiceDeploymentsQuery({
    variables: { clusterId: clusterId || '', q: debouncedSearchString },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const [tableFilters, setTableFilters] = useState<
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
      [refetch, tableFilters]
    )

  if (error) {
    return (
      <EmptyState message="Looks like you don't have any service deployments yet." />
    )
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        height: '100%',
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
        }}
      >
        <ServicesFilters
          serviceDeployments={data?.serviceDeployments}
          setTableFilters={setTableFilters}
          showClusterSelect={false}
          searchString={searchString}
          setSearchString={setSearchString}
        />
        <DeployService refetch={refetch} />
      </div>
      {!isEmpty(data?.serviceDeployments?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.serviceDeployments?.edges || []}
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
                getServiceDetailsPath({
                  clusterName: original.node?.cluster?.name,
                  serviceId: original.node?.id,
                })
              )
            }
            reactTableOptions={reactTableOptions}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any service deployments yet." />
      )}
    </div>
  )
}
