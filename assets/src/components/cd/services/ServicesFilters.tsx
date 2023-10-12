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
import { useDebounce } from '@react-hooks-library/core'
import {
  ServiceDeploymentStatus,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'

import { useNavigate, useParams } from 'react-router-dom'

import { SERVICE_PARAM_CLUSTER } from 'routes/cdRoutesConsts'

import {
  serviceStatusToLabel,
  serviceStatusToSeverity,
} from './ServiceStatusChip'
import { ServicesCluster } from './Services'

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
  data,
  clusters,
  setTableFilters,
}: {
  data: ReturnType<typeof useServiceDeploymentsQuery>['data']
  clusters?: ServicesCluster[]
  setTableFilters: (
    filters: Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  ) => void
}) {
  const clusterName = useParams()[SERVICE_PARAM_CLUSTER]

  console.log('clusterName', clusterName)
  const navigate = useNavigate()
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [filterString, setFilterString] = useState('')
  const debouncedFilterString = useDebounce(filterString, 100)
  const [statusFilterKey, setStatusTabKey] = useState<Key>('ALL')
  const counts = useMemo(() => {
    const c: Record<string, number | undefined> = {
      ALL: data?.serviceDeployments?.edges?.length,
      HEALTHY: 0,
      SYNCED: 0,
      STALE: 0,
      FAILED: 0,
    }

    data?.serviceDeployments?.edges?.forEach((edge) => {
      if (edge?.node?.status) {
        c[edge?.node?.status] = (c[edge?.node?.status] ?? 0) + 1
      }
    })

    return c
  }, [data?.serviceDeployments?.edges])
  const [clusterSelectIsOpen, setClusterSelectIsOpen] = useState(false)

  const tableFilters: Partial<
    Pick<TableState, 'globalFilter' | 'columnFilters'>
  > = useMemo(
    () => ({
      globalFilter: debouncedFilterString,
      columnFilters: [
        ...(statusFilterKey !== 'ALL'
          ? [
              {
                id: 'status',
                value: statusFilterKey,
              },
            ]
          : []),
        ...(clusterName
          ? [
              {
                id: 'cluster',
                value: clusterName,
              },
            ]
          : []),
      ],
    }),
    [clusterName, debouncedFilterString, statusFilterKey]
  )

  useEffect(() => {
    setTableFilters(tableFilters)
  }, [setTableFilters, tableFilters])

  return (
    <ServiceFiltersSC>
      {clusters && !isEmpty(clusters) && (
        <div css={{ width: 360 }}>
          <Select
            isOpen={clusterSelectIsOpen}
            onOpenChange={setClusterSelectIsOpen}
            label="Filter by cluster"
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
            {clusters.map((cluster) => (
              <ListBoxItem
                key={cluster.name}
                label={cluster.name}
                textValue={cluster.name}
              />
            ))}
          </Select>
        </div>
      )}
      <Input
        placeholder="Search"
        startIcon={<SearchIcon />}
        value={filterString}
        onChange={(e) => {
          setFilterString(e.currentTarget.value)
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
