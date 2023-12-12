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
import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import isNil from 'lodash/isNil'

import {
  ServiceDeploymentStatus,
  ServiceStatusCountFragment,
  useClustersTinyQuery,
} from 'generated/graphql'
import { SERVICE_PARAM_CLUSTER_ID } from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import ProviderIcon from 'components/utils/Provider'

import {
  serviceStatusToLabel,
  serviceStatusToSeverity,
} from './ServiceStatusChip'

export type StatusTabKey = ServiceDeploymentStatus | 'ALL'
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
  statusFilter,
  setStatusFilter,
  searchString,
  setSearchString,
  clusterId,
  setClusterId,
  tabStateRef,
  statusCounts,
}: {
  searchString
  setSearchString: (string) => void
  statusFilter: StatusTabKey
  setStatusFilter: Dispatch<SetStateAction<StatusTabKey>>
  clusterId?: string
  setClusterId?: Dispatch<SetStateAction<string>>
  tabStateRef: MutableRefObject<any>
  statusCounts: Nullable<Nullable<ServiceStatusCountFragment>[]>
}) {
  const theme = useTheme()
  const clusterIdParam = useParams()[SERVICE_PARAM_CLUSTER_ID]

  clusterId = clusterId ?? clusterIdParam

  const { data: clustersData } = useClustersTinyQuery({
    skip: !setClusterId,
  })

  const clusters = useMemo(
    () => mapExistingNodes(clustersData?.clusters),
    [clustersData?.clusters]
  )
  const selectedCluster = useMemo(
    () => clusters && clusters.find((cluster) => cluster.id === clusterId),
    [clusters, clusterId]
  )

  const counts = useMemo<Record<string, number | undefined>>(
    () => ({
      ALL: statusCounts?.reduce(
        (count, status) => count + (status?.count || 0),
        0
      ),
      HEALTHY: statusCounts ? 0 : undefined,
      SYNCED: statusCounts ? 0 : undefined,
      STALE: statusCounts ? 0 : undefined,
      FAILED: statusCounts ? 0 : undefined,
      ...Object.fromEntries(
        statusCounts?.map((status) => [status?.status, status?.count]) || []
      ),
    }),
    [statusCounts]
  )
  const [clusterSelectIsOpen, setClusterSelectIsOpen] = useState(false)

  useEffect(() => {
    setStatusFilter(statusFilter)
  }, [setStatusFilter, statusFilter])

  return (
    <ServiceFiltersSC>
      {setClusterId && (
        <div css={{ width: 360 }}>
          <Select
            isDisabled={!clustersData}
            isOpen={clusterSelectIsOpen}
            onOpenChange={setClusterSelectIsOpen}
            label={!clustersData ? 'Loading clusters..' : 'Filter by cluster'}
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
            {...(clusterId
              ? {
                  dropdownFooterFixed: (
                    <ListBoxFooter
                      onClick={() => {
                        setClusterSelectIsOpen(false)
                        setClusterId?.('')
                      }}
                      leftContent={<ClusterIcon />}
                    >
                      Show all clusters
                    </ListBoxFooter>
                  ),
                }
              : {})}
            selectedKey={clusterId || ''}
            onSelectionChange={(key) => setClusterId?.(key as string)}
          >
            {(clusters || []).map((cluster) => (
              <ListBoxItem
                key={cluster.id}
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
          selectedKey: statusFilter,
          onSelectionChange: (key) => {
            setStatusFilter(key as StatusTabKey)
          },
        }}
      >
        {statusTabs?.map(([key, { label }]) => (
          <SubTab
            key={key}
            textValue={label}
            className="statusTab"
          >
            {label}
            {!isNil(counts[key]) && (
              <Chip
                size="small"
                severity={serviceStatusToSeverity(key as any)}
                loading={isNil(counts[key])}
              >
                {counts[key]}
              </Chip>
            )}
          </SubTab>
        ))}
      </TabList>
    </ServiceFiltersSC>
  )
}
