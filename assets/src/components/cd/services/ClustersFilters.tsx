import {
  Chip,
  Input,
  ListBoxItem,
  SearchIcon,
  Select,
  SubTab,
  TabList,
} from '@pluralsh/design-system'

import { useDebounce } from '@react-hooks-library/core'

import { UpgradeStatistics } from 'generated/graphql'
import { isNumber } from 'lodash'
import isNil from 'lodash/isNil'
import {
  type ComponentProps,
  Dispatch,
  RefObject,
  SetStateAction,
  useDeferredValue,
  useEffect,
  useState,
} from 'react'
import styled from 'styled-components'
import { TagsFilter } from './ClusterTagsFilter'
import { serviceStatusToSeverity } from './ServiceStatusChip'

export type ClusterStatusTabKey = 'HEALTHY' | 'UNHEALTHY' | 'ALL'
export type UpgradeableFilterKey = 'ALL' | 'UPGRADEABLE' | 'NON-UPGRADEABLE'
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
  upgradeableFilter,
  setUpgradeableFilter,
  upgradeStats,
}: {
  setQueryStatusFilter: Dispatch<SetStateAction<ClusterStatusTabKey>>
  setQueryString: (string) => void
  tabStateRef: RefObject<any>
  statusCounts: Record<ClusterStatusTabKey, number | undefined>
  selectedTagKeys: ComponentProps<typeof TagsFilter>['selectedTagKeys']
  setSelectedTagKeys: ComponentProps<typeof TagsFilter>['setSelectedTagKeys']
  tagOp: ComponentProps<typeof TagsFilter>['searchOp']
  setTagOp: ComponentProps<typeof TagsFilter>['setSearchOp']
  upgradeableFilter: UpgradeableFilterKey
  setUpgradeableFilter: (val: UpgradeableFilterKey) => void
  upgradeStats: Nullable<Pick<UpgradeStatistics, 'upgradeable' | 'count'>>
}) {
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 400)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const deferredStatusFilter = useDeferredValue(statusFilter)
  const { count, upgradeable } = upgradeStats ?? {}
  const hasUpgradeStats = isNumber(count) && isNumber(upgradeable)

  useEffect(() => {
    setQueryString(debouncedSearchString)
  }, [searchString, debouncedSearchString, setQueryString])

  useEffect(() => {
    setQueryStatusFilter(deferredStatusFilter)
  }, [setQueryStatusFilter, deferredStatusFilter])

  return (
    <ClustersFiltersSC>
      <div css={{ flex: '1 1 25%' }}>
        <TagsFilter
          selectedTagKeys={selectedTagKeys}
          setSelectedTagKeys={setSelectedTagKeys}
          searchOp={tagOp}
          setSearchOp={setTagOp}
        />
      </div>
      <div css={{ flex: '1 1 25%', minWidth: 120 }}>
        <Input
          placeholder="Search"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) => {
            setSearchString(e.currentTarget.value)
          }}
        />
      </div>
      <div css={{ minWidth: 180 }}>
        <TabList
          scrollable
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
      </div>
      <div css={{ minWidth: 240 }}>
        <Select
          label={upgradeableFilter}
          selectedKey={upgradeableFilter}
          onSelectionChange={(key) =>
            setUpgradeableFilter(key as UpgradeableFilterKey)
          }
        >
          <ListBoxItem
            key="ALL"
            label="All upgrade statuses"
            rightContent={hasUpgradeStats && <Chip size="small">{count}</Chip>}
          />
          <ListBoxItem
            key="UPGRADEABLE"
            label="Upgradeable only"
            rightContent={
              hasUpgradeStats && <Chip size="small">{upgradeable}</Chip>
            }
          />
          <ListBoxItem
            key="NON-UPGRADEABLE"
            label="Non-upgradeable only"
            rightContent={
              hasUpgradeStats && <Chip size="small">{count - upgradeable}</Chip>
            }
          />
        </Select>
      </div>
    </ClustersFiltersSC>
  )
}
