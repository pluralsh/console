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
  HeatMapFlavor,
  useClusterHeatMapQuery,
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
import { GqlError } from 'components/utils/Alert'

const { capacity, CapacityType, toValues } = Prometheus

export function ClusterMetrics() {
  const { spacing } = useTheme()
  const { clusterId } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const [heatMapFlavor, setHeatMapFlavor] = useState<HeatMapFlavor>(
    HeatMapFlavor.Pod
  )

  const {
    data: metricsData,
    loading: metricsLoading,
    error: metricsError,
  } = useClusterMetricsQuery({
    variables: { clusterId: clusterId ?? '' },
    skip: !metricsEnabled,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const {
    data: heatMapData,
    loading: heatMapLoading,
    error: heatMapError,
  } = useClusterHeatMapQuery({
    variables: { clusterId: clusterId ?? '', flavor: heatMapFlavor },
    skip: !metricsEnabled || !clusterId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const { cpuMetrics, memMetrics, podsMetrics } = useMemo(
    () => processClusterMetrics(metricsData?.cluster),
    [metricsData?.cluster]
  )
  console.log(heatMapData)
  if (!metricsEnabled) return <EmptyState message="Metrics are not enabled." />

  const hasMetrics =
    !isNull(cpuMetrics.total) &&
    !isNull(memMetrics.total) &&
    (cpuMetrics.usage?.length ?? 0) > 0

  return (
    <WrapperSC>
      <Flex
        direction="column"
        gap="small"
      >
        <Subtitle2H1>Metrics</Subtitle2H1>
        <Card css={{ padding: spacing.xlarge }}>
          {!hasMetrics ? (
            metricsError ? (
              <GqlError error={metricsError} />
            ) : metricsLoading ? (
              <LoadingIndicator />
            ) : (
              <EmptyState message="No metrics available." />
            )
          ) : (
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
          )}
        </Card>
      </Flex>
      <Flex
        flex={1}
        gap="medium"
        direction="column"
      >
        <Flex
          width="100%"
          justifyContent="space-between"
        >
          <Subtitle2H1>Memory & CPU utliization</Subtitle2H1>
          <Flex
            gap="small"
            align="center"
          >
            <CaptionP $color="text-xlight">Group by</CaptionP>
            <Select
              width={160}
              selectedKey={heatMapFlavor}
              onSelectionChange={(e) => setHeatMapFlavor(e as HeatMapFlavor)}
            >
              <ListBoxItem
                key={HeatMapFlavor.Pod}
                label="Pod"
              />
              <ListBoxItem
                key={HeatMapFlavor.Namespace}
                label="Namespace"
              />
            </Select>
          </Flex>
        </Flex>
        {!heatMapData ? (
          <Card css={{ padding: spacing.xlarge, flex: 1 }}>
            {heatMapError ? (
              <GqlError
                css={{ width: '100%' }}
                error={heatMapError}
              />
            ) : heatMapLoading ? (
              <LoadingIndicator />
            ) : (
              <EmptyState message="Utilization heatmaps not available." />
            )}
          </Card>
        ) : (
          <Flex
            gap="large"
            flex={1}
          >
            <Card
              header={{ content: `memory cost by ${heatMapFlavor}` }}
              css={{ height: '100%' }}
            >
              <div>heatmap one</div>
            </Card>
            <Card
              header={{ content: `cpu cost by ${heatMapFlavor}` }}
              css={{ height: '100%' }}
            >
              <div>heatmap two</div>
            </Card>
          </Flex>
        )}
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
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
