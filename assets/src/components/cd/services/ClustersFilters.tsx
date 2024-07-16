import { type ComponentProps, useDeferredValue, useState } from 'react'
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

import { useDebounce } from '@react-hooks-library/core'

import { serviceStatusToSeverity } from './ServiceStatusChip'
import { TagsFilter } from './ClusterTagsFilter'

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
  setQueryStatusFilter,
  setQueryString,
  tabStateRef,
  statusCounts,
  selectedTagKeys,
  setSelectedTagKeys,
  tagOp,
  setTagOp,
}: {
  setQueryStatusFilter: Dispatch<SetStateAction<ClusterStatusTabKey>>
  setQueryString: (string) => void
  tabStateRef: MutableRefObject<any>
  statusCounts: Record<ClusterStatusTabKey, number | undefined>
  selectedTagKeys: ComponentProps<typeof TagsFilter>['selectedTagKeys']
  setSelectedTagKeys: ComponentProps<typeof TagsFilter>['setSelectedTagKeys']
  tagOp: ComponentProps<typeof TagsFilter>['searchOp']
  setTagOp: ComponentProps<typeof TagsFilter>['setSearchOp']
}) {
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 400)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const deferredStatusFilter = useDeferredValue(statusFilter)

  useEffect(() => {
    setQueryString(debouncedSearchString)
  }, [searchString, debouncedSearchString, setQueryString])

  useEffect(() => {
    setQueryStatusFilter(deferredStatusFilter)
  }, [setQueryStatusFilter, deferredStatusFilter])

  return (
    <ClustersFiltersSC>
      <div css={{ flex: '1 1 50%' }}>
        <TagsFilter
          selectedTagKeys={selectedTagKeys}
          setSelectedTagKeys={setSelectedTagKeys}
          searchOp={tagOp}
          setSearchOp={setTagOp}
        />
      </div>
      <div css={{ flex: '1 1 50%' }}>
        <Input
          placeholder="Search"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) => {
            setSearchString(e.currentTarget.value)
          }}
        />
      </div>
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
