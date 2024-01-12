import {
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import styled from 'styled-components'
import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react'
import isNil from 'lodash/isNil'

import { serviceStatusToSeverity } from './ServiceStatusChip'

export type ClusterStatusTabKey = 'HEALTHY' | 'UNHEALTHY' | 'ALL'
export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  HEALTHY: {
    label: 'Healthy',
  },
  UNHEALTHY: {
    label: 'Unhealthy',
  },
} as const satisfies Record<string, { label: string }>)

const ClustersFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  columnGap: theme.spacing.medium,
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export function ClustersFilters({
  statusFilter,
  setStatusFilter,
  searchString,
  setSearchString,
  tabStateRef,
  statusCounts,
}: {
  searchString
  setSearchString: (string) => void
  statusFilter: ClusterStatusTabKey
  setStatusFilter: Dispatch<SetStateAction<ClusterStatusTabKey>>
  tabStateRef: MutableRefObject<any>
  statusCounts: Record<ClusterStatusTabKey, number | undefined>
}) {
  useEffect(() => {
    setStatusFilter(statusFilter)
  }, [setStatusFilter, statusFilter])

  return (
    <ClustersFiltersSC>
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
            setStatusFilter(key as ClusterStatusTabKey)
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
    </ClustersFiltersSC>
  )
}
