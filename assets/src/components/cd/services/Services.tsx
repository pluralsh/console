import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { Chip, EmptyState, Table } from '@pluralsh/design-system'
import {
  AuthMethod,
  ServiceDeploymentsDocument,
  type ServiceDeploymentsRowFragment,
  useDeleteServiceDeploymentMutation,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { ComponentProps, useMemo, useState } from 'react'
import { type TableState } from '@tanstack/react-table'
import uniqBy from 'lodash/uniqBy'
import isEmpty from 'lodash/isEmpty'
import { Confirm } from 'components/utils/Confirm'
import { DeleteIconButton } from 'components/utils/IconButtons'
import { createMapperWithFallback } from 'utils/mapping'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { removeConnection, updateCache } from 'utils/graphql'

import { useSetCDHeaderContent } from '../ContinuousDeployment'

import {
  ColCluster,
  ColLastActivity,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
  getColActions,
} from './ServicesColumns'
import { DeployService } from './ServicesDeployService'
import { ServicesFilters } from './ServicesFilters'

const POLL_INTERVAL = 10 * 1000

export type ServicesCluster = Exclude<
  ServiceDeploymentsRowFragment['cluster'],
  undefined | null
>

// Will need to update once delete mutation exists in API
export function DeleteService({
  service,
  refetch,
}: {
  service: ServiceDeploymentsRowFragment
  refetch: () => void
}) {
  const theme = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading, error }] = useDeleteServiceDeploymentMutation({
    variables: { id: service.id ?? '' },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: ServiceDeploymentsDocument,
        update: (prev) =>
          removeConnection(
            prev,
            data?.deleteServiceDeployment,
            'deploymentServices'
          ),
      }),
    onCompleted: () => {
      setConfirm(false)
      refetch?.()
    },
  })

  return (
    <>
      <DeleteIconButton
        onClick={() => setConfirm(true)}
        tooltip
      />
      <Confirm
        open={confirm}
        title="Delete service deployment"
        text={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.medium,
            }}
          >
            <p>Are you sure you want to delete this service deployment?"</p>
            <p>{service.name}</p>
          </div>
        }
        close={() => setConfirm(false)}
        submit={() => mutation()}
        loading={loading}
        destructive
        error={error}
      />
    </>
  )
}

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

export default function Services() {
  const theme = useTheme()
  const { data, error, refetch } = useServiceDeploymentsQuery({
    pollInterval: POLL_INTERVAL,
  })
  const columns = useMemo(
    () => [
      ColServiceDeployment,
      ColCluster,
      ColRepo,
      ColLastActivity,
      ColStatus,
      getColActions({ refetch }),
    ],
    [refetch]
  )
  const clusters = useMemo(
    () =>
      uniqBy(data?.serviceDeployments?.edges, (edge) => edge?.node?.cluster?.id)
        .map((edge) => edge?.node?.cluster)
        .filter(
          (
            cluster: ServiceDeploymentsRowFragment['cluster']
          ): cluster is ServicesCluster => !!cluster
        ),
    [data?.serviceDeployments?.edges]
  )

  useSetCDHeaderContent(
    useMemo(() => <DeployService refetch={refetch} />, [refetch])
  )
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
      }),
      [tableFilters]
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
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <ServicesFilters
        data={data}
        clusters={clusters}
        setTableFilters={setTableFilters}
      />
      {!isEmpty(data?.serviceDeployments?.edges) ? (
        <FullHeightTableWrap>
          <Table
            data={data?.serviceDeployments?.edges || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
            reactTableOptions={reactTableOptions}
          />
        </FullHeightTableWrap>
      ) : (
        <EmptyState message="Looks like you don't have any service deployments yet." />
      )}
    </div>
  )
}
