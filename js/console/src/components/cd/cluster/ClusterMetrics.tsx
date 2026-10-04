import {
  ArrowTopRightIcon,
  Button,
  EmptyState,
  Flex,
  HeatMapIcon,
  KubernetesIcon,
  ListBoxItem,
  NamespaceIcon,
  Select,
  SmallNodeIcon,
  SmallPodIcon,
  TimeSeriesIcon,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { MetricsCard } from 'components/utils/metrics/MetricsCard'
import { MetricsSection } from 'components/utils/metrics/MetricsSection'
import {
  MetricsGraphCard,
  MetricsGraphGrid,
} from 'components/utils/metrics/MetricsGraphCard'
import {
  METRIC_FORMATTERS,
  METRIC_TICK_BASES,
} from 'components/utils/metrics/metricFormats'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import {
  ClusterMetricsGrouping,
  ClusterWithMetricsFragment,
  HeatMapFlavor,
  useClusterHeatMapQuery,
  useClusterMetricsQuery,
  useClusterNoisyNeighborsQuery,
  useClusterUsageMetricsQuery,
} from 'generated/graphql'
import { capitalize, isEmpty, isNull } from 'lodash'
import styled, { useTheme } from 'styled-components'

import { Prometheus } from '../../../utils/prometheus'

import { GqlError } from 'components/utils/Alert'
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { Graph } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { UtilizationHeatmap } from 'components/utils/UtilizationHeatmap'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  type TimeRangeState,
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import { type ReactNode, useMemo, useState } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts'
import { GLOBAL_SETTINGS_ABS_PATH } from 'routes/settingsRoutesConst'
import { isNonNullable } from 'utils/isNonNullable'
import {
  ClusterGauges,
  CPUClusterMetrics,
  MemoryClusterMetrics,
  PodsClusterMetrics,
} from '../../cluster/nodes/ClusterGauges'
import {
  type ClusterMetricGraph,
  clusterMetricSections,
  usageFieldVariables,
} from './metrics/clusterMetricsGraphs'

const { capacity, CapacityType, toValues } = Prometheus
const HEATMAP_HEIGHT = 350
const METRICS_DIRECTORY = [
  { path: 'timeseries', icon: <TimeSeriesIcon />, tooltip: 'Timeseries' },
  { path: 'heatmap', icon: <HeatMapIcon />, tooltip: 'Heat map' },
]
const GROUPINGS = [
  {
    key: ClusterMetricsGrouping.Cluster,
    label: 'Cluster',
    icon: <KubernetesIcon size={16} />,
  },
  {
    key: ClusterMetricsGrouping.Namespace,
    label: 'Namespace',
    icon: <NamespaceIcon size={16} />,
  },
  {
    key: ClusterMetricsGrouping.Node,
    label: 'Node',
    icon: <SmallNodeIcon size={16} />,
  },
]
const HEAT_MAP_FLAVOR_ICONS: Record<HeatMapFlavor, ReactNode> = {
  [HeatMapFlavor.Pod]: <SmallPodIcon size={16} />,
  [HeatMapFlavor.Namespace]: <NamespaceIcon size={16} />,
  [HeatMapFlavor.Node]: <SmallNodeIcon size={16} />,
}

type ClusterMetricsOutletContext = { viewToggle?: ReactNode }

export function ClusterMetrics({
  basePath,
  inlineToggle = false,
}: {
  /** absolute path of this metrics route, defaults to the CD cluster page */
  basePath?: string
  /** render the timeseries/heatmap toggle in each view's controls row rather than the page header */
  inlineToggle?: boolean
}) {
  const { clusterId } = useParams()
  const metricsPath =
    basePath ?? `${getClusterDetailsPath({ clusterId })}/metrics`
  const { pathname } = useLocation()
  const metricsEnabled = useMetricsEnabled()
  const deploymentSettingsLoading = useLoadingDeploymentSettings()

  const currentTab =
    METRICS_DIRECTORY.find(({ path }) => pathname.endsWith(path))?.path ??
    'timeseries'

  const viewToggle = useMemo(
    () => (
      <ButtonGroup
        directory={METRICS_DIRECTORY}
        tab={currentTab}
        toPath={(path) => `${metricsPath}/${path}`}
      />
    ),
    [metricsPath, currentTab]
  )

  useSetPageHeaderContent(inlineToggle ? undefined : viewToggle)

  if (!(metricsEnabled || deploymentSettingsLoading))
    return <MetricsEmptyState />

  return (
    <Outlet
      context={
        {
          viewToggle: inlineToggle ? (
            <InlineToggleSC>{viewToggle}</InlineToggleSC>
          ) : undefined,
        } satisfies ClusterMetricsOutletContext
      }
    />
  )
}

function useViewToggle() {
  return useOutletContext<ClusterMetricsOutletContext | undefined>()?.viewToggle
}

// matches the 32px time range control
const InlineToggleSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  height: 32,
  width: 'fit-content',
  '& > *': { boxSizing: 'border-box', height: '100%' },
  '& a > *': {
    alignItems: 'center',
    boxSizing: 'border-box',
    padding: `0 ${theme.spacing.small}px`,
  },
}))

export function ClusterMetricsTimeseries() {
  const { clusterId } = useParams()
  const timeRange = useTimeRange()
  const [grouping, setGrouping] = useState(ClusterMetricsGrouping.Cluster)
  const sections = useMemo(() => clusterMetricSections(grouping), [grouping])
  const viewToggle = useViewToggle()

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
          <Select
            size="small"
            width={140}
            selectedKey={grouping}
            leftContent={GROUPINGS.find(({ key }) => key === grouping)?.icon}
            onSelectionChange={(key) =>
              setGrouping(key as ClusterMetricsGrouping)
            }
          >
            {GROUPINGS.map(({ key, label, icon }) => (
              <ListBoxItem
                key={key}
                label={label}
                leftContent={icon}
              />
            ))}
          </Select>
        </Flex>
        <Flex
          gap="small"
          align="center"
        >
          <MetricsTimeRangeControl timeRange={timeRange} />
          {viewToggle}
        </Flex>
      </Flex>
      {sections.map(({ key, title, description, graphs }) => (
        <MetricsSection
          key={key}
          title={title}
          description={description}
        >
          <MetricsGraphGrid>
            {graphs.map((graph) => (
              <ClusterMetricGraphCard
                key={`${grouping}-${graph.key}`}
                clusterId={clusterId}
                grouping={grouping}
                graph={graph}
                timeRange={timeRange}
              />
            ))}
          </MetricsGraphGrid>
        </MetricsSection>
      ))}
    </WrapperSC>
  )
}

function ClusterMetricGraphCard({
  clusterId,
  grouping,
  graph: { title, tooltip, format, fields, series },
  timeRange,
}: {
  clusterId?: string
  grouping: ClusterMetricsGrouping
  graph: ClusterMetricGraph
  timeRange: TimeRangeState
}) {
  const metricsEnabled = useMetricsEnabled()
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useClusterUsageMetricsQuery({
    variables: {
      clusterId: clusterId ?? '',
      groupBy: grouping,
      ...metricsQueryWindow(timeRange.timeWindow),
      ...usageFieldVariables(fields),
    },
    skip: !metricsEnabled || !clusterId,
    fetchPolicy: 'cache-and-network',
  })
  const data = useRangeQueryData(
    { data: currentData, previousData },
    timeRange.revision
  )
  const metrics = data?.cluster?.clusterUsageMetrics
  const graphData = useMemo(
    () => (metrics ? series(metrics) : []),
    [metrics, series]
  )

  return (
    <MetricsGraphCard
      title={title}
      tooltip={tooltip}
    >
      {error ? (
        <GqlError error={error} />
      ) : !data && loading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : isEmpty(graphData) ? (
        <EmptyState
          message="No data"
          description="Prometheus returned no series in the selected time range."
        />
      ) : (
        <Graph
          data={graphData}
          yFormat={METRIC_FORMATTERS[format]}
          yTickBase={METRIC_TICK_BASES[format]}
          timeWindow={timeRange.timeWindow}
          onRangeSelect={timeRange.selectWindow}
        />
      )}
    </MetricsGraphCard>
  )
}

export function ClusterMetricsHeatmap() {
  const { spacing } = useTheme()
  const { clusterId } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const deploymentSettingsLoading = useLoadingDeploymentSettings()

  const [heatMapFlavor, setHeatMapFlavor] = useState<HeatMapFlavor>(
    HeatMapFlavor.Node
  )

  const {
    utilLoading,
    utilError: error,
    utilCpuHeatMap,
    utilMemoryHeatMap,
  } = useClusterHeatmapData({
    clusterId,
    fetchUtilization: true,
    utilizationFlavor: heatMapFlavor,
  })
  const loading = utilLoading || deploymentSettingsLoading

  const {
    data: metricsData,
    loading: metricsQueryLoading,
    error: metricsError,
  } = useClusterMetricsQuery({
    variables: { clusterId: clusterId ?? '' },
    skip: !metricsEnabled,
    fetchPolicy: 'cache-and-network',
  })
  const metricsLoading = metricsQueryLoading || deploymentSettingsLoading

  const { cpuMetrics, memMetrics, podsMetrics } = useMemo(
    () => processClusterMetrics(metricsData?.cluster),
    [metricsData?.cluster]
  )

  const hasMetrics =
    !isNull(cpuMetrics.total) &&
    !isNull(memMetrics.total) &&
    (cpuMetrics.usage?.length ?? 0) > 0
  const hasHeatmapData = !isEmpty(utilCpuHeatMap) || !isEmpty(utilMemoryHeatMap)
  const viewToggle = useViewToggle()

  return (
    <WrapperSC>
      {viewToggle && <Flex justifyContent="flex-end">{viewToggle}</Flex>}
      <MetricsCard
        css={{
          display: 'flex',
          justifyContent: 'center',
          gap: spacing.large,
          padding: spacing.xlarge,
        }}
      >
        {metricsError ? (
          <GqlError error={metricsError} />
        ) : !metricsData && metricsLoading ? (
          <RectangleSkeleton
            $height={240}
            $width="100%"
          />
        ) : hasMetrics ? (
          <ClusterGauges
            cpu={cpuMetrics}
            memory={memMetrics}
            pods={podsMetrics}
          />
        ) : (
          <EmptyState message="No metrics available." />
        )}
      </MetricsCard>
      <Flex
        width="100%"
        align="center"
        justifyContent="space-between"
      >
        <Subtitle2H1>Memory & CPU utilization</Subtitle2H1>
        <Flex
          gap="small"
          align="center"
        >
          <CaptionP $color="text-xlight">Group by</CaptionP>
          <Select
            size="small"
            width={140}
            selectedKey={heatMapFlavor}
            leftContent={HEAT_MAP_FLAVOR_ICONS[heatMapFlavor]}
            onSelectionChange={(e) => setHeatMapFlavor(e as HeatMapFlavor)}
          >
            {Object.values(HeatMapFlavor).map((flavor) => (
              <ListBoxItem
                key={flavor}
                label={capitalize(flavor)}
                leftContent={HEAT_MAP_FLAVOR_ICONS[flavor]}
              />
            ))}
          </Select>
        </Flex>
      </Flex>
      {!(hasHeatmapData || loading) ? (
        <MetricsCard css={{ padding: spacing.xlarge }}>
          {error ? (
            <GqlError
              css={{ width: '100%' }}
              error={error}
            />
          ) : (
            <EmptyState message="Utilization heatmaps not available." />
          )}
        </MetricsCard>
      ) : (
        <MetricsGraphGrid>
          <MetricsCard
            header={{
              content: `memory utilization by ${heatMapFlavor}`,
              outerProps: { style: { flexShrink: 0, height: 'fit-content' } },
            }}
            css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
          >
            <UtilizationHeatmap
              colorScheme="blue"
              data={utilMemoryHeatMap}
              loading={loading}
              flavor={heatMapFlavor}
              utilizationType="memory"
            />
          </MetricsCard>
          <MetricsCard
            header={{
              content: `cpu utilization by ${heatMapFlavor}`,
              outerProps: { style: { flexShrink: 0, height: 'fit-content' } },
            }}
            css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
          >
            <UtilizationHeatmap
              colorScheme="purple"
              data={utilCpuHeatMap}
              loading={loading}
              flavor={heatMapFlavor}
              utilizationType="cpu"
            />
          </MetricsCard>
        </MetricsGraphGrid>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  paddingBottom: theme.spacing.large,
}))

export function useClusterHeatmapData({
  clusterId,
  fetchNoisyNeighbors = false,
  fetchUtilization = false,
  utilizationFlavor = HeatMapFlavor.Node,
}: {
  clusterId?: string
  fetchNoisyNeighbors?: boolean
  fetchUtilization?: boolean
  utilizationFlavor?: HeatMapFlavor
}) {
  const metricsEnabled = useMetricsEnabled()
  const {
    data: utilData,
    loading: utilLoading,
    error: utilError,
  } = useClusterHeatMapQuery({
    variables: { clusterId: clusterId ?? '', flavor: utilizationFlavor },
    skip: !metricsEnabled || !clusterId || !fetchUtilization,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const {
    data: nnData,
    loading: nnLoading,
    error: nnError,
  } = useClusterNoisyNeighborsQuery({
    variables: { clusterId: clusterId ?? '' },
    skip: !metricsEnabled || !clusterId || !fetchNoisyNeighbors,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const ret = useMemo(
    () => ({
      utilCpuHeatMap:
        utilData?.cluster?.heatMap?.cpu?.filter(isNonNullable) ?? [],
      utilMemoryHeatMap:
        utilData?.cluster?.heatMap?.memory?.filter(isNonNullable) ?? [],
      noisyCpuHeatMap:
        nnData?.cluster?.noisyNeighbors?.cpu?.filter(isNonNullable) ?? [],
      noisyMemoryHeatMap:
        nnData?.cluster?.noisyNeighbors?.memory?.filter(isNonNullable) ?? [],
      utilLoading: !utilData && utilLoading,
      utilError,
      nnLoading: !nnData && nnLoading,
      nnError,
    }),
    [utilData, nnData, utilLoading, utilError, nnLoading, nnError]
  )

  return ret
}

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
