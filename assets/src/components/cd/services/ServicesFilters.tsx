import {
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'

import { useDebounce } from '@react-hooks-library/core'

import { ServiceDeploymentStatus } from 'generated/graphql'
import isNil from 'lodash/isNil'
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from 'react'
import styled from 'styled-components'

import ClusterSelector from '../utils/ClusterSelector'

import {
  serviceStatusToLabel,
  serviceStatusToSeverity,
} from './ServiceStatusChip'
import { useOutletContext } from 'react-router-dom'
import { ServicesContextT } from './Services'

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
  setQueryStatusFilter,
  hideSearch = false,
  tabStateRef,
  statusCounts,
}: {
  setQueryStatusFilter: Dispatch<SetStateAction<StatusTabKey>>
  hideSearch?: boolean
  tabStateRef: RefObject<any>
  statusCounts: Record<StatusTabKey, number | undefined>
}) {
  const { q, setQ, clusterId, setClusterId } =
    useOutletContext<ServicesContextT>()
  const [searchString, setSearchString] = useState(q || '')
  const debouncedSearchString = useDebounce(searchString, 250)
  const [statusFilter, setStatusFilter] = useState<StatusTabKey>('ALL')
  const deferredStatusFilter = useDeferredValue(statusFilter)

  useEffect(() => {
    setQ?.(debouncedSearchString)
  }, [searchString, debouncedSearchString, setQ])

  useEffect(() => {
    setQueryStatusFilter(deferredStatusFilter)
  }, [setQueryStatusFilter, deferredStatusFilter])

  const onClusterChange = useCallback(
    (cluster) => {
      setClusterId?.(cluster?.id || '')
    },
    [setClusterId]
  )

  return (
    <ServiceFiltersSC>
      {setClusterId && (
        <div css={{ minWidth: 260, width: 360 }}>
          <ClusterSelector
            clusterId={clusterId}
            allowDeselect
            onClusterChange={onClusterChange}
          />
        </div>
      )}
      <div css={{ minWidth: 120, flex: 1 }}>
        {!hideSearch && (
          <Input
            placeholder="Search"
            startIcon={<SearchIcon />}
            value={searchString}
            onChange={(e) => setSearchString(e.currentTarget.value)}
            css={{ flexGrow: 1 }}
          />
        )}
      </div>
      <TabList
        scrollable
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
                fillLevel={statusFilter === key ? 2 : 0}
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
