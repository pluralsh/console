import { Chip, SubTab, TabList } from '@pluralsh/design-system'

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
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'

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
  alignItems: 'center',
  columnGap: theme.spacing.medium,
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export function useServicesSearch(
  q: Nullable<string>,
  setQ: Nullable<(q: string) => void>
) {
  const [searchString, setSearchString] = useState(q || '')
  const debouncedSearchString = useDebounce(searchString, 250)

  useEffect(() => {
    setQ?.(debouncedSearchString)
  }, [debouncedSearchString, setQ])

  return [searchString, setSearchString] as const
}

export function ServicesFilters({
  setQueryStatusFilter,
  tabStateRef,
  statusCounts,
  loadingStatuses,
}: {
  setQueryStatusFilter: Dispatch<SetStateAction<StatusTabKey>>
  tabStateRef: RefObject<any>
  statusCounts: Record<StatusTabKey, number | undefined>
  loadingStatuses: boolean
}) {
  const { clusterId, setClusterId } = useOutletContext<ServicesContextT>()
  const [statusFilter, setStatusFilter] = useState<StatusTabKey>('ALL')
  const deferredStatusFilter = useDeferredValue(statusFilter)

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
        <div css={{ minWidth: 220, width: 300 }}>
          <ClusterSelector
            clusterId={clusterId}
            allowDeselect
            onClusterChange={onClusterChange}
            inputProps={{ small: true }}
          />
        </div>
      )}
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
            size="small"
            textValue={label}
            className="statusTab"
          >
            {label}
            {isNil(statusCounts?.[key]) ? (
              loadingStatuses && (
                <RectangleSkeleton
                  $width={26}
                  $height={22}
                />
              )
            ) : (
              <Chip
                fillLevel={statusFilter === key ? 2 : 0}
                size="small"
                severity={serviceStatusToSeverity(key as any)}
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
