import {
  Flex,
  ListBoxItem,
  NamespaceIcon,
  SmallNodeIcon,
  SmallPodIcon,
} from '@pluralsh/design-system'
import { MetricsEmptyState } from 'components/cd/cluster/ClusterMetrics'
import { usageFieldVariables } from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import { UsageMetricGraphCard } from 'components/cd/cluster/metrics/UsageMetricGraphCard'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { CompactSelect } from 'components/utils/CompactSelect'
import {
  MetricsGraphGrid,
  MetricsScrollSC,
} from 'components/utils/metrics/MetricsGraphCard'
import { MetricsSection } from 'components/utils/metrics/MetricsSection'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  type TimeRangeState,
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import { CaptionP } from 'components/utils/typography/Text'
import {
  NodeMetricsGrouping,
  useNodeUsageMetricsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import styled from 'styled-components'

import { type NodeMetricGraph, nodeMetricSections } from './nodeMetricsGraphs'

const GROUPINGS = [
  {
    key: NodeMetricsGrouping.Node,
    label: 'Node',
    icon: <SmallNodeIcon size={16} />,
  },
  {
    key: NodeMetricsGrouping.Namespace,
    label: 'Namespace',
    icon: <NamespaceIcon size={16} />,
  },
  {
    key: NodeMetricsGrouping.Pod,
    label: 'Pod',
    icon: <SmallPodIcon size={16} />,
  },
]

/** Prometheus dashboard for a single node: host, reservations, workloads and health. */
export function NodeMetrics({
  clusterId,
  node,
}: {
  clusterId: string
  node: string
}) {
  const metricsEnabled = useMetricsEnabled()
  const deploymentSettingsLoading = useLoadingDeploymentSettings()
  const timeRange = useTimeRange()
  const [grouping, setGrouping] = useState(NodeMetricsGrouping.Node)
  const sections = useMemo(() => nodeMetricSections(grouping), [grouping])

  if (!(metricsEnabled || deploymentSettingsLoading))
    return <MetricsEmptyState />

  return (
    <WrapperSC>
      <Flex
        align="center"
        justifyContent="space-between"
        gap="medium"
        wrap="wrap"
      >
        <Flex
          gap="small"
          align="center"
        >
          <CaptionP $color="text-xlight">Group by</CaptionP>
          <CompactSelect
            size="small"
            width={140}
            selectedKey={grouping}
            leftContent={GROUPINGS.find(({ key }) => key === grouping)?.icon}
            onSelectionChange={(key) => setGrouping(key as NodeMetricsGrouping)}
          >
            {GROUPINGS.map(({ key, label, icon }) => (
              <ListBoxItem
                key={key}
                label={label}
                leftContent={icon}
              />
            ))}
          </CompactSelect>
        </Flex>
        <MetricsTimeRangeControl timeRange={timeRange} />
      </Flex>
      <MetricsScrollSC>
        {sections.map(({ key, title, description, graphs }) => (
          <MetricsSection
            key={key}
            title={title}
            description={description}
          >
            <MetricsGraphGrid>
              {graphs.map((graph) => (
                <NodeMetricGraphCard
                  key={`${grouping}-${graph.key}`}
                  clusterId={clusterId}
                  node={node}
                  grouping={grouping}
                  graph={graph}
                  timeRange={timeRange}
                />
              ))}
            </MetricsGraphGrid>
          </MetricsSection>
        ))}
      </MetricsScrollSC>
    </WrapperSC>
  )
}

function NodeMetricGraphCard({
  clusterId,
  node,
  grouping,
  graph,
  timeRange,
}: {
  clusterId: string
  node: string
  grouping: NodeMetricsGrouping
  graph: NodeMetricGraph
  timeRange: TimeRangeState
}) {
  const metricsEnabled = useMetricsEnabled()
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useNodeUsageMetricsQuery({
    variables: {
      clusterId,
      node,
      groupBy: grouping,
      ...metricsQueryWindow(timeRange.timeWindow),
      ...usageFieldVariables(graph.fields),
    },
    skip: !metricsEnabled || !clusterId || !node,
    // every graph selects different fields of one un-normalized object, so
    // caching makes each response re-diff every other graph's series
    fetchPolicy: 'no-cache',
  })
  const data = useRangeQueryData(
    { data: currentData, previousData },
    timeRange.revision
  )

  return (
    <UsageMetricGraphCard
      graph={graph}
      metrics={data?.cluster?.nodeUsageMetrics}
      loading={loading}
      error={error}
      timeRange={timeRange}
    />
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  minHeight: 0,
}))
