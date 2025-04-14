import {
  Card,
  EmptyState,
  Flex,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import {
  ClusterWithMetricsFragment,
  useClusterMetricsQuery,
} from 'generated/graphql'
import { isNull } from 'lodash'
import styled, { useTheme } from 'styled-components'

import { Prometheus } from '../../../utils/prometheus'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ClusterGauges,
  CPUClusterMetrics,
  MemoryClusterMetrics,
  PodsClusterMetrics,
} from '../../cluster/nodes/ClusterGauges'
import { SaturationGraphs } from '../../cluster/nodes/SaturationGraphs'

const { capacity, CapacityType, toValues } = Prometheus

export function ClusterMetrics() {
  const theme = useTheme()
  const { clusterId } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const [groupByOption, setGroupByOption] = useState<'node' | 'pod'>('node')

  const { data, loading } = useClusterMetricsQuery({
    variables: { clusterId: clusterId ?? '' },
    skip: !metricsEnabled || !clusterId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const { cpuMetrics, memMetrics, podsMetrics } = useMemo(
    () => processClusterMetrics(data?.cluster),
    [data?.cluster]
  )

  if (loading) return <LoadingIndicator />
  if (
    !metricsEnabled ||
    isNull(cpuMetrics.total) ||
    isNull(memMetrics.total) ||
    !clusterId ||
    (cpuMetrics.usage?.length ?? 0) === 0
  )
    return (
      <EmptyState
        message={metricsEnabled ? 'No metrics available.' : 'Metrics disabled'}
      />
    )

  return (
    <WrapperSC>
      <Flex
        direction="column"
        gap="small"
      >
        <Subtitle2H1>Metrics</Subtitle2H1>
        <Card css={{ padding: theme.spacing.xlarge }}>
          <Flex
            width="100%"
            gap="xsmall"
          >
            <ClusterGauges
              cpu={cpuMetrics}
              memory={memMetrics}
              pods={podsMetrics}
            />
            <SaturationGraphs
              cpuUsage={cpuMetrics.usage}
              cpuTotal={cpuMetrics.total}
              memUsage={memMetrics.usage}
              memTotal={memMetrics.total}
            />
          </Flex>
        </Card>
      </Flex>
      <Flex gap="small">
        <Flex
          width="100%"
          justifyContent="space-between"
        >
          <Subtitle2H1>Memory & CPU utilization</Subtitle2H1>
          <Flex
            gap="small"
            align="center"
          >
            <CaptionP $color="text-xlight">Group by</CaptionP>
            <Select
              selectedKey={groupByOption}
              onSelectionChange={(e) => setGroupByOption(e as 'node' | 'pod')}
            >
              <ListBoxItem
                key="node"
                label="Node"
              />
              <ListBoxItem
                key="pod"
                label="Pod"
              />
            </Select>
          </Flex>
        </Flex>
        <Flex gap="large"></Flex>
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
}))

const processClusterMetrics = (
  cluster: Nullable<ClusterWithMetricsFragment>
): {
  cpuMetrics: CPUClusterMetrics
  memMetrics: MemoryClusterMetrics
  podsMetrics: PodsClusterMetrics
} => {
  const nodes = cluster?.nodes?.filter(isNonNullable) ?? []
  const clusterMetrics = cluster?.clusterMetrics ?? {}
  return {
    cpuMetrics: {
      usage: toValues(clusterMetrics.cpuUsage),
      requests: toValues(clusterMetrics.cpuRequests),
      limits: toValues(clusterMetrics.cpuLimits),
      total: capacity(CapacityType.CPU, ...nodes) ?? 0,
    },
    memMetrics: {
      usage: toValues(clusterMetrics.memoryUsage),
      requests: toValues(clusterMetrics.memoryRequests),
      limits: toValues(clusterMetrics.memoryLimits),
      total: capacity(CapacityType.Memory, ...nodes) ?? 0,
    },
    podsMetrics: {
      used: toValues(clusterMetrics.pods),
      total: capacity(CapacityType.Pods, ...nodes) ?? 0,
    },
  }
}
