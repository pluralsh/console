import {
  Chip,
  ClusterIcon,
  Input,
  ListBoxFooter,
  ListBoxItem,
  SearchIcon,
  Select,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { Key, useEffect, useMemo, useRef, useState } from 'react'
import { type TableState } from '@tanstack/react-table'
import {
  ServiceDeploymentStatus,
  useClustersTinyQuery,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import { useNavigate, useParams } from 'react-router-dom'

import { SERVICE_PARAM_CLUSTER } from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

import ProviderIcon from 'components/utils/Provider'

import {
  serviceStatusToLabel,
  serviceStatusToSeverity,
} from './ServiceStatusChip'

type StatusTabKey = ServiceDeploymentStatus | 'ALL'
export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  [ServiceDeploymentStatus.Healthy]: {
    label: serviceStatusToLabel(ServiceDeploymentStatus.Healthy),
  },
  [ServiceDeploymentStatus.Synced]: {
    label: serviceStatusToLabel(ServiceDeploymentStatus.Synced),
  },
  [ServiceDeploymentStatus.Stale]: {
    label: serviceStatusToLabel(ServiceDeploymentStatus.Stale),
  },
  [ServiceDeploymentStatus.Failed]: {
    label: serviceStatusToLabel(ServiceDeploymentStatus.Failed),
  },
} as const satisfies Record<StatusTabKey, { label: string }>)

const ServiceFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  columnGap: theme.spacing.medium,
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export function ServicesFilters({
  serviceDeployments,
  setTableFilters,
  searchString,
  setSearchString,
  showClusterSelect = true,
}: {
  serviceDeployments: NonNullable<
    ReturnType<typeof useServiceDeploymentsQuery>['data']
  >['serviceDeployments']
  searchString
  setSearchString: (string) => void
  setTableFilters: (
    filters: Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  ) => void
  showClusterSelect: boolean
}) {
  const clusterName = useParams()[SERVICE_PARAM_CLUSTER]
  const navigate = useNavigate()
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [statusFilterKey, setStatusTabKey] = useState<Key>('ALL')

  const { data } = useClustersTinyQuery({ skip: !showClusterSelect })
  const clusters = useMemo(
    () => mapExistingNodes(data?.clusters),
    [data?.clusters]
  )
  const selectedCluster = useMemo(
    () => clusters && clusters.find((cluster) => cluster.name === clusterName),
    [clusters, clusterName]
  )

  console.log('selectedClusterName', selectedCluster)

  const counts = useMemo(() => {
    const c: Record<string, number | undefined> = {
      ALL: serviceDeployments?.edges?.length,
      HEALTHY: 0,
      SYNCED: 0,
      STALE: 0,
      FAILED: 0,
    }

    serviceDeployments?.edges?.forEach((edge) => {
      if (edge?.node?.status) {
        c[edge?.node?.status] = (c[edge?.node?.status] ?? 0) + 1
      }
    })

    return c
  }, [serviceDeployments?.edges])
  const [clusterSelectIsOpen, setClusterSelectIsOpen] = useState(false)

  const tableFilters: Partial<
    Pick<TableState, 'globalFilter' | 'columnFilters'>
  > = useMemo(
    () => ({
      columnFilters: [
        ...(statusFilterKey !== 'ALL'
          ? [
              {
                id: 'status',
                value: statusFilterKey,
              },
            ]
          : []),
      ],
    }),
    [statusFilterKey]
  )

  useEffect(() => {
    setTableFilters(tableFilters)
  }, [setTableFilters, tableFilters])

  return (
    <ServiceFiltersSC>
      {showClusterSelect && (
        <div css={{ width: 360 }}>
          <Select
            isDisabled={!data}
            isOpen={clusterSelectIsOpen}
            onOpenChange={setClusterSelectIsOpen}
            label={!data ? 'Loading clusters..' : 'Filter by cluster'}
            leftContent={
              selectedCluster && (
                <ProviderIcon
                  provider={selectedCluster.provider?.cloud || ''}
                  width={16}
                />
              )
            }
            titleContent={
              <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
                <ClusterIcon />
                Cluster
              </div>
            }
            {...(clusterName
              ? {
                  dropdownFooterFixed: (
                    <ListBoxFooter
                      onClick={() => {
                        setClusterSelectIsOpen(false)
                        navigate(`/cd/services`)
                      }}
                      leftContent={<ClusterIcon />}
                    >
                      Show all clusters
                    </ListBoxFooter>
                  ),
                }
              : {})}
            selectedKey={clusterName || ''}
            onSelectionChange={(key) => {
              navigate(`/cd/services${key ? `/${key}` : ''}`)
            }}
          >
            {(clusters || []).map((cluster) => (
              <ListBoxItem
                key={cluster.name}
                label={cluster.name}
                textValue={cluster.name}
                leftContent={
                  <ProviderIcon
                    provider={cluster.provider?.cloud || ''}
                    width={16}
                  />
                }
              />
            ))}
          </Select>
        </div>
      )}
      <Input
        placeholder="Search"
        startIcon={<SearchIcon />}
        value={searchString}
        onChange={(e) => {
          setSearchString?.(e.currentTarget.value)
        }}
        css={{ flexGrow: 1 }}
      />
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: statusFilterKey,
          onSelectionChange: (key) => {
            setStatusTabKey(key)
          },
        }}
      >
        {statusTabs.map(([key, { label }]) => (
          <SubTab
            key={key}
            textValue={label}
            className="statusTab"
          >
            {label}
            <Chip
              size="small"
              severity={serviceStatusToSeverity(key as any)}
            >
              {counts[key] ?? 0}
            </Chip>
          </SubTab>
        ))}
      </TabList>
    </ServiceFiltersSC>
  )
}
