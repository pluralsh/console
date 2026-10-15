import { Chip, ChipSeverity, SubTab } from '@pluralsh/design-system'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { UpgradeStatistics } from 'generated/graphql'
import { isNumber } from 'lodash'
import isNil from 'lodash/isNil'
import {
  type ComponentProps,
  Dispatch,
  SetStateAction,
  useDeferredValue,
  useEffect,
  useState,
} from 'react'
import styled from 'styled-components'
import { TagsFilter } from './ClusterTagsFilter'
import { serviceStatusToSeverity } from './ServiceStatusChip'

export type ClusterStatusTabKey = 'ALL' | 'HEALTHY' | 'UNHEALTHY'
export type UpgradeableFilterKey = 'ALL' | 'UPGRADEABLE' | 'NON-UPGRADEABLE'
export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  HEALTHY: { label: 'Healthy' },
  UNHEALTHY: { label: 'Unhealthy' },
} as const satisfies Record<ClusterStatusTabKey, { label: string }>) as [
  ClusterStatusTabKey,
  { label: string },
][]
// Both groups are plain toggle buttons rather than tab lists: a tab list can't
// be left unselected, and "All" has to clear both groups. Deselecting an
// upgrade filter falls back to 'ALL'.
const upgradeTabs = Object.entries({
  UPGRADEABLE: { label: 'Upgradeable' },
  'NON-UPGRADEABLE': { label: 'Non-upgradeable' },
} as const) as [Exclude<UpgradeableFilterKey, 'ALL'>, { label: string }][]

const DividerSC = styled.div(({ theme }) => ({
  alignSelf: 'center',
  flexShrink: 0,
  width: 1,
  height: 20,
  backgroundColor: theme.colors.border,
}))

const TabGroupSC = styled.div({
  display: 'flex',
  alignItems: 'center',
})

const ClustersFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  columnGap: theme.spacing.small,
  alignItems: 'center',
  whiteSpace: 'nowrap',
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export function ClustersFilters({
  setQueryStatusFilter,
  statusCounts,
  selectedTagKeys,
  setSelectedTagKeys,
  tagOp,
  setTagOp,
  upgradeableFilter,
  setUpgradeableFilter,
  upgradeStats,
  loadingStatuses,
}: {
  setQueryStatusFilter: Dispatch<SetStateAction<ClusterStatusTabKey>>
  statusCounts: Record<ClusterStatusTabKey, number | undefined>
  selectedTagKeys: ComponentProps<typeof TagsFilter>['selectedTagKeys']
  setSelectedTagKeys: ComponentProps<typeof TagsFilter>['setSelectedTagKeys']
  tagOp: ComponentProps<typeof TagsFilter>['searchOp']
  setTagOp: ComponentProps<typeof TagsFilter>['setSearchOp']
  upgradeableFilter: UpgradeableFilterKey
  setUpgradeableFilter: (val: UpgradeableFilterKey) => void
  upgradeStats: Nullable<Pick<UpgradeStatistics, 'upgradeable' | 'count'>>
  loadingStatuses: boolean
}) {
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const deferredStatusFilter = useDeferredValue(statusFilter)
  const { count, upgradeable } = upgradeStats ?? {}
  const hasUpgradeStats = isNumber(count) && isNumber(upgradeable)

  useEffect(() => {
    setQueryStatusFilter(deferredStatusFilter)
  }, [setQueryStatusFilter, deferredStatusFilter])

  return (
    <ClustersFiltersSC>
      <div css={{ flex: '0 1 400px', minWidth: 200 }}>
        <TagsFilter
          selectedTagKeys={selectedTagKeys}
          setSelectedTagKeys={setSelectedTagKeys}
          searchOp={tagOp}
          setSearchOp={setTagOp}
          small
        />
      </div>
      <TabGroupSC>
        {statusTabs.map(([key, { label }]) => {
          // "All" means no filters at all, so it also clears the upgrade filter
          const isAll = key === 'ALL'
          const selected =
            statusFilter === key && (!isAll || upgradeableFilter === 'ALL')

          return (
            <SubTab
              key={key}
              size="small"
              active={selected}
              aria-pressed={selected}
              className="statusTab"
              onClick={() => {
                setStatusFilter(key)
                if (isAll) setUpgradeableFilter('ALL')
              }}
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
                  fillLevel={selected ? 2 : 0}
                  size="small"
                  severity={serviceStatusToSeverity(key as any)}
                >
                  {statusCounts?.[key]}
                </Chip>
              )}
            </SubTab>
          )
        })}
      </TabGroupSC>
      <DividerSC />
      <TabGroupSC>
        {upgradeTabs.map(([key, { label }]) => {
          const selected = upgradeableFilter === key

          return (
            <SubTab
              key={key}
              size="small"
              active={selected}
              aria-pressed={selected}
              className="statusTab"
              onClick={() => setUpgradeableFilter(selected ? 'ALL' : key)}
            >
              {label}
              {hasUpgradeStats && (
                <Chip
                  fillLevel={selected ? 2 : 0}
                  size="small"
                  severity={upgradeFilterToSeverity(key)}
                >
                  {key === 'UPGRADEABLE' ? upgradeable : count - upgradeable}
                </Chip>
              )}
            </SubTab>
          )
        })}
      </TabGroupSC>
    </ClustersFiltersSC>
  )
}

const upgradeFilterToSeverity = (
  filter: Exclude<UpgradeableFilterKey, 'ALL'>
): ChipSeverity => {
  switch (filter) {
    case 'UPGRADEABLE':
      return 'success'
    case 'NON-UPGRADEABLE':
      return 'danger'
  }
}
