import {
  ArrowTopRightIcon,
  Button,
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
import { capitalize, isNull } from 'lodash'
import styled, { useTheme } from 'styled-components'

import { Prometheus } from '../../../utils/prometheus'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { GqlError } from 'components/utils/Alert'
import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { UtilizationHeatmap } from 'components/utils/UtilizationHeatmap'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ClusterGauges,
  CPUClusterMetrics,
  MemoryClusterMetrics,
  PodsClusterMetrics,
} from '../../cluster/nodes/ClusterGauges'
import { SaturationGraphs } from '../../cluster/nodes/SaturationGraphs'

const { capacity, CapacityType, toValues } = Prometheus
const HEATMAP_HEIGHT = 350

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
  const { cpuHeatMap, memoryHeatMap } = useMemo(
    () => ({
      cpuHeatMap:
        heatMapData?.cluster?.heatMap?.cpu?.filter(isNonNullable) ?? [],
      memoryHeatMap:
        heatMapData?.cluster?.heatMap?.memory?.filter(isNonNullable) ?? [],
    }),
    [heatMapData?.cluster?.heatMap]
  )

  if (!metricsEnabled) return <MetricsEmptyState />

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
              {Object.values(HeatMapFlavor).map((flavor) => (
                <ListBoxItem
                  key={flavor}
                  label={capitalize(flavor)}
                />
              ))}
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
            overflowX="auto"
            flex={1}
          >
            <Card
              header={{
                content: `memory utilization by ${heatMapFlavor}`,
                outerProps: {
                  style: { paddingBottom: spacing.large, overflow: 'visible' },
                },
              }}
              css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
            >
              <UtilizationHeatmap
                colorScheme="blue"
                data={memoryHeatMap}
                flavor={heatMapFlavor}
                utilizationType="memory"
              />
            </Card>
            <Card
              header={{
                content: `cpu utilization by ${heatMapFlavor}`,
                outerProps: {
                  style: { paddingBottom: spacing.large, overflow: 'visible' },
                },
              }}
              css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
            >
              <UtilizationHeatmap
                colorScheme="purple"
                data={cpuHeatMap}
                flavor={heatMapFlavor}
                utilizationType="cpu"
              />
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

export const MetricsEmptyState = () => (
  <EmptyState message="Metrics are not enabled.">
    <Button
      as={Link}
      to={`${GLOBAL_SETTINGS_ABS_PATH}/observability`}
      endIcon={<ArrowTopRightIcon />}
    >
      Go to settings
    </Button>
  </EmptyState>
)
