import {
  Chip,
  Flex,
  Input,
  SearchIcon,
  SubTab,
  Table,
  TabList,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  SentinelCheckType,
  SentinelFragment,
  SentinelRunStatus,
  useSentinelsQuery,
} from '../../../generated/graphql.ts'
import { mapExistingNodes } from '../../../utils/graphql.ts'
import { GqlError } from '../../utils/Alert.tsx'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData.tsx'
import { sentinelsCols } from './AISentinelsTableCols.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { Key } from '@react-types/shared'

export type StatusFilterKey = SentinelRunStatus | 'ALL'

export const statusTabs = Object.entries({
  ALL: { label: 'All' },
  [SentinelRunStatus.Failed]: { label: 'Failed' },
  [SentinelRunStatus.Success]: { label: 'Passed' },
  [SentinelRunStatus.Pending]: { label: 'Pending' },
} as const satisfies Record<StatusFilterKey, { label: string }>)

function countsFromSentinels(sentinels: SentinelFragment[]) {
  const c: Record<string, number> = {
    ALL: sentinels.length,
    [SentinelRunStatus.Failed]: 0,
    [SentinelRunStatus.Success]: 0,
    [SentinelRunStatus.Pending]: 0,
  }

  sentinels.forEach((sentinel) => {
    if (sentinel.status) {
      c[sentinel.status] = (c[sentinel.status] ?? 0) + 1
    }
  })

  return c
}

function sentinelStatusToSeverity(status: StatusFilterKey) {
  switch (status) {
    case SentinelRunStatus.Failed:
      return 'danger'
    case SentinelRunStatus.Success:
      return 'success'
    case SentinelRunStatus.Pending:
      return 'warning'
    default:
      return 'neutral'
  }
}

const SentinelsFiltersSC = styled.div(({ theme }) => ({
  display: 'flex',
  columnGap: theme.spacing.medium,
  flexGrow: 1,
  '.statusTab': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
  },
}))

export function AISentinels() {
  const tabStateRef = useRef<any>(null)
  const [filterString, setFilterString] = useState('')
  const [statusFilterKey, setStatusFilterKey] = useState<Key>('ALL')
  const debouncedFilterString = useDebounce(filterString, 100)

  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useSentinelsQuery,
      keyPath: ['sentinels'],
    })

  const sentinels = useMemo(() => mapExistingNodes(data?.sentinels), [data])

  const filteredSentinels = useMemo(() => {
    let filtered = sentinels

    // Apply status filter
    if (statusFilterKey !== 'ALL') {
      filtered = filtered.filter(
        (sentinel) => sentinel.status === statusFilterKey
      )
    }

    // Apply search filter
    if (debouncedFilterString) {
      const searchLower = debouncedFilterString.toLowerCase()
      filtered = filtered.filter((sentinel) =>
        sentinel.name?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [sentinels, statusFilterKey, debouncedFilterString])

  const statusCounts = useMemo(
    // TODO: replace with statistics query
    () => countsFromSentinels(sentinels),
    [sentinels]
  )

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <StackedText
        first="Registered sentinels"
        firstPartialType="body2Bold"
        firstColor="text"
        second="AI-powered sentinel monitoring for your Kubernetes clusters."
        secondPartialType="body2"
        secondColor="text-light"
      />
      <SentinelsFiltersSC>
        <Input
          css={{ width: '40%' }}
          startIcon={<SearchIcon />}
          placeholder="Search by sentinel name"
          value={filterString}
          onChange={(e) => {
            setFilterString(e.currentTarget.value)
          }}
        />
        <TabList
          scrollable
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: statusFilterKey,
            onSelectionChange: (key) => {
              setStatusFilterKey(key)
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
                severity={sentinelStatusToSeverity(key as any)}
              >
                {statusCounts[key] ?? 0}
              </Chip>
            </SubTab>
          ))}
        </TabList>
      </SentinelsFiltersSC>
      <Table
        rowBg="raised"
        fullHeightWrap
        virtualizeRows
        loading={!data && loading}
        // data={filteredSentinels}
        data={mockData}
        columns={sentinelsCols}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No sentinels found.' }}
      />
    </Flex>
  )
}

const NUM_MOCK_ITEMS = 20

const baseMockSentinels: SentinelFragment[] = [
  {
    __typename: 'Sentinel',
    id: '1',
    name: 'Error Log Monitor',
    description: 'Monitors application logs for critical errors and exceptions',
    status: SentinelRunStatus.Success,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    git: {
      __typename: 'GitRef',
      ref: 'main',
      folder: 'sentinels/logs',
    },
    repository: {
      __typename: 'GitRepository',
      id: 'repo-1',
      url: 'https://github.com/pluralsh/sentinels',
    },
    checks: [
      {
        __typename: 'SentinelCheck',
        id: 'check-1',
        name: 'Critical Error Check',
        type: SentinelCheckType.Log,
        ruleFile: 'error-monitor.sentinel',
        configuration: {
          __typename: 'SentinelCheckConfiguration',
          log: {
            __typename: 'SentinelCheckLogConfiguration',
            namespaces: ['production', 'staging'],
            query: 'level:ERROR OR level:CRITICAL',
            clusterId: 'cluster-prod-1',
            facets: [
              {
                __typename: 'LogFacet',
                key: 'service',
                value: 'api',
              },
            ],
          },
          kubernetes: null,
        },
      },
    ],
  },
  {
    __typename: 'Sentinel',
    id: '2',
    name: 'Pod Health Check',
    description: 'Ensures all critical pods are running and healthy',
    status: SentinelRunStatus.Failed,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    git: {
      __typename: 'GitRef',
      ref: 'main',
      folder: 'sentinels/kubernetes',
    },
    repository: {
      __typename: 'GitRepository',
      id: 'repo-2',
      url: 'https://github.com/pluralsh/infrastructure-monitoring',
    },
    checks: [
      {
        __typename: 'SentinelCheck',
        id: 'check-2',
        name: 'Pod Status Check',
        type: SentinelCheckType.Kubernetes,
        ruleFile: 'pod-health.sentinel',
        configuration: {
          __typename: 'SentinelCheckConfiguration',
          log: null,
          kubernetes: {
            __typename: 'SentinelCheckKubernetesConfiguration',
            group: '',
            version: 'v1',
            kind: 'Pod',
            name: 'api-server',
            namespace: 'production',
          },
        },
      },
    ],
  },
  {
    __typename: 'Sentinel',
    id: '3',
    name: 'Deployment Status Monitor',
    description:
      'Tracks deployment health and replica counts across all namespaces',
    status: SentinelRunStatus.Pending,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    git: {
      __typename: 'GitRef',
      ref: 'develop',
      folder: 'sentinels/deployments',
    },
    repository: {
      __typename: 'GitRepository',
      id: 'repo-3',
      url: 'https://github.com/pluralsh/infrastructure-monitoring',
    },
    checks: [
      {
        __typename: 'SentinelCheck',
        id: 'check-3',
        name: 'Deployment Replica Check',
        type: SentinelCheckType.Kubernetes,
        ruleFile: 'deployment-health.sentinel',
        configuration: {
          __typename: 'SentinelCheckConfiguration',
          log: null,
          kubernetes: {
            __typename: 'SentinelCheckKubernetesConfiguration',
            group: 'apps',
            version: 'v1',
            kind: 'Deployment',
            name: 'web-app',
            namespace: 'production',
          },
        },
      },
      {
        __typename: 'SentinelCheck',
        id: 'check-4',
        name: 'Deployment Error Logs',
        type: SentinelCheckType.Log,
        ruleFile: 'deployment-errors.sentinel',
        configuration: {
          __typename: 'SentinelCheckConfiguration',
          log: {
            __typename: 'SentinelCheckLogConfiguration',
            namespaces: ['production'],
            query: 'deployment AND (failed OR error)',
            clusterId: 'cluster-prod-2',
            facets: null,
          },
          kubernetes: null,
        },
      },
    ],
  },
  {
    __typename: 'Sentinel',
    id: '4',
    name: 'Database Connection Monitor',
    description: 'Monitors database connection pool and query performance',
    status: SentinelRunStatus.Success,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    git: {
      __typename: 'GitRef',
      ref: 'main',
      folder: 'sentinels/database',
    },
    repository: null,
    checks: [
      {
        __typename: 'SentinelCheck',
        id: 'check-5',
        name: 'Connection Pool Check',
        type: SentinelCheckType.Log,
        ruleFile: 'db-connection.sentinel',
        configuration: {
          __typename: 'SentinelCheckConfiguration',
          log: {
            __typename: 'SentinelCheckLogConfiguration',
            namespaces: ['production', 'staging'],
            query: 'database AND (timeout OR "connection refused")',
            clusterId: 'cluster-prod-1',
            facets: [
              {
                __typename: 'LogFacet',
                key: 'component',
                value: 'database',
              },
              {
                __typename: 'LogFacet',
                key: 'severity',
                value: 'high',
              },
            ],
          },
          kubernetes: null,
        },
      },
    ],
  },
]

const mockData: SentinelFragment[] = Array.from(
  { length: NUM_MOCK_ITEMS },
  (_, i) => {
    const baseSentinel = baseMockSentinels[i % baseMockSentinels.length]
    return {
      ...baseSentinel,
      id: `${baseSentinel.id}-${Math.floor(i / baseMockSentinels.length)}`,
    }
  }
)
