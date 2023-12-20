import {
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import styled from 'styled-components'
import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
} from 'react'
import isNil from 'lodash/isNil'

import { ServiceDeploymentStatus } from 'generated/graphql'

import ClusterSelector from '../utils/ClusterSelector'

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
  [ServiceDeploymentStatus.Paused]: {
    label: serviceStatusToLabel(ServiceDeploymentStatus.Paused),
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
  statusCounts: Record<StatusTabKey, number | undefined>
}) {
  useEffect(() => {
    setStatusFilter(statusFilter)
  }, [setStatusFilter, statusFilter])
  const onClusterChange = useCallback(
    (cluster) => {
      setClusterId?.(cluster?.id || '')
    },
    [setClusterId]
  )

  return (
    <ServiceFiltersSC>
      {setClusterId && (
        <div css={{ width: 360 }}>
          <ClusterSelector
            clusterId={clusterId}
            allowDeselect
            onClusterChange={onClusterChange}
          />
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
            {!isNil(statusCounts?.[key]) && (
              <Chip
                size="small"
                severity={serviceStatusToSeverity(key as any)}
                loading={isNil(statusCounts?.[key])}
              >
                {statusCounts?.[key]}
              </Chip>
            )}
          </SubTab>
        ))}
      </TabList>
    </ServiceFiltersSC>
  )
}
