import {
  Chip,
  ChipSeverity,
  Input,
  ListBoxItem,
  SearchIcon,
  Select,
  SelectButton,
} from '@pluralsh/design-system'

import { useDebounce } from '@react-hooks-library/core'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { ServiceDeploymentStatus, UpgradeStatistics } from 'generated/graphql'
import { capitalize, isNumber } from 'lodash'
import isNil from 'lodash/isNil'
import {
  type ComponentProps,
  Dispatch,
  SetStateAction,
  useDeferredValue,
  useEffect,
  useState,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { TagsFilter } from './ClusterTagsFilter'
import { serviceStatusToSeverity } from './ServiceStatusChip'

export type ClusterStatusTabKey = 'ALL' | 'HEALTHY' | 'UNHEALTHY'
export type UpgradeableFilterKey = 'ALL' | 'UPGRADEABLE' | 'NON-UPGRADEABLE'
export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  HEALTHY: { label: 'Healthy' },
  UNHEALTHY: { label: 'Unhealthy' },
} as const satisfies Record<string, { label: string }>)

const ClustersFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  columnGap: theme.spacing.medium,
  whiteSpace: 'nowrap',
}))

export function ClustersFilters({
  setQueryStatusFilter,
  setQueryString,
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
  setQueryString: (string) => void
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
  const { colors } = useTheme()
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
      <div css={{ minWidth: 200 }}>
        <Select
          selectedKey={statusFilter}
          onSelectionChange={(key) =>
            setStatusFilter(key as ClusterStatusTabKey)
          }
          triggerButton={
            <SelectButton
              rightContent={
                statusFilter !== 'ALL' &&
                !isNil(statusCounts?.[statusFilter]) && (
                  <Chip
                    size="small"
                    severity={serviceStatusToSeverity(
                      statusFilter as ServiceDeploymentStatus
                    )}
                  >
                    {statusCounts[statusFilter]}
                  </Chip>
                )
              }
              css={{
                borderColor:
                  statusFilter === 'ALL' ? undefined : colors['border-primary'],
              }}
            >
              {statusFilter === 'ALL'
                ? 'Filter by health'
                : statusTabs.find(([k]) => k === statusFilter)?.[1].label}
            </SelectButton>
          }
        >
          {statusTabs.map(([key, { label }]) => (
            <ListBoxItem
              key={key}
              label={label}
              rightContent={
                isNil(statusCounts?.[key]) ? (
                  loadingStatuses && (
                    <RectangleSkeleton
                      $width={26}
                      $height={22}
                    />
                  )
                ) : (
                  <Chip
                    size="small"
                    severity={serviceStatusToSeverity(key as any)}
                  >
                    {statusCounts?.[key]}
                  </Chip>
                )
              }
            />
          ))}
        </Select>
      </div>
      <Select
        selectedKey={upgradeableFilter}
        onSelectionChange={(key) =>
          setUpgradeableFilter(key as UpgradeableFilterKey)
        }
        triggerButton={
          <SelectButton
            rightContent={
              hasUpgradeStats &&
              upgradeableFilter !== 'ALL' && (
                <Chip
                  size="small"
                  severity={upgradeFilterToSeverity(upgradeableFilter)}
                >
                  {upgradeableFilter === 'UPGRADEABLE'
                    ? upgradeable
                    : count - upgradeable}
                </Chip>
              )
            }
            css={{
              borderColor:
                upgradeableFilter === 'ALL'
                  ? undefined
                  : colors['border-primary'],
            }}
          >
            {upgradeableFilter === 'ALL'
              ? 'Filter by upgrade status'
              : capitalize(upgradeableFilter)}
          </SelectButton>
        }
      >
        <ListBoxItem
          key="ALL"
          label="All"
          rightContent={
            hasUpgradeStats && (
              <Chip
                size="small"
                severity={upgradeFilterToSeverity('ALL')}
              >
                {count}
              </Chip>
            )
          }
        />
        <ListBoxItem
          key="UPGRADEABLE"
          label="Upgradeable"
          rightContent={
            hasUpgradeStats && (
              <Chip
                size="small"
                severity={upgradeFilterToSeverity('UPGRADEABLE')}
              >
                {upgradeable}
              </Chip>
            )
          }
        />
        <ListBoxItem
          key="NON-UPGRADEABLE"
          label="Non-upgradeable"
          rightContent={
            hasUpgradeStats && (
              <Chip
                size="small"
                severity="danger"
              >
                {count - upgradeable}
              </Chip>
            )
          }
        />
      </Select>
    </ClustersFiltersSC>
  )
}

const upgradeFilterToSeverity = (
  filter: UpgradeableFilterKey
): ChipSeverity => {
  switch (filter) {
    case 'ALL':
      return 'neutral'
    case 'UPGRADEABLE':
      return 'success'
    case 'NON-UPGRADEABLE':
      return 'danger'
  }
}
