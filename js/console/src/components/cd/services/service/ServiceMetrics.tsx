import {
  DeploymentIcon,
  EmptyState,
  Flex,
  HeatMapIcon,
  ListBoxItem,
  SmallPodIcon,
  TimeSeriesIcon,
} from '@pluralsh/design-system'
import { CompactSelect } from 'components/utils/CompactSelect'
import { MetricsCard } from 'components/utils/metrics/MetricsCard'
import {
  MetricsGraphGrid,
  MetricsScrollSC,
} from 'components/utils/metrics/MetricsGraphCard'
import { MetricsSection } from 'components/utils/metrics/MetricsSection'
import {
  type ClusterMetricGraph,
  usageFieldVariables,
} from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import { UsageMetricGraphCard } from 'components/cd/cluster/metrics/UsageMetricGraphCard'
import { serviceMetricSections } from './metrics/serviceMetricsGraphs'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  type TimeRangeState,
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import {
  HeatMapFlavor,
  ServiceMetricsGrouping,
  useServiceHeatMapQuery,
  useServiceUsageMetricsQuery,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { useTheme } from 'styled-components'

import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { useMemo, useState } from 'react'
import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'

import { GqlError } from 'components/utils/Alert'
import { ButtonGroup } from 'components/utils/ButtonGroup.tsx'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { UtilizationHeatmap } from 'components/utils/UtilizationHeatmap'

const HEATMAP_HEIGHT = 350
const METRICS_DIRECTORY = [
  { path: 'timeseries', icon: <TimeSeriesIcon />, tooltip: 'Timeseries' },
  { path: 'heatmap', icon: <HeatMapIcon />, tooltip: 'Heat map' },
]

export function ServiceMetrics() {
  const metricsEnabled = useMetricsEnabled()
  const loadingDeploymentSettings = useLoadingDeploymentSettings()
  const { pathname } = useLocation()

  const currentTab = useMemo(
    () =>
      METRICS_DIRECTORY.find(({ path }) => pathname.endsWith(path))?.path ??
      'timeseries',
    [pathname]
  )

  useSetPageHeaderContent(
    useMemo(
      () => (
        <ButtonGroup
          directory={METRICS_DIRECTORY}
          tab={currentTab}
          toPath={(path) => `metrics/${path}`}
        />
      ),
      [currentTab]
    )
  )

  if (!(metricsEnabled || loadingDeploymentSettings))
    return <EmptyState message="Metrics are not enabled." />

  return <Outlet context={{ metricsEnabled, loadingDeploymentSettings }} />
}

function ServiceMetricsHeatmap() {
  const { spacing } = useTheme()
  const { serviceId } = useParams()
  const { metricsEnabled, loadingDeploymentSettings } = useOutletContext<{
    metricsEnabled: boolean
    loadingDeploymentSettings: boolean
  }>()
  const [heatMapFlavor, setHeatMapFlavor] = useState<HeatMapFlavor>(
    HeatMapFlavor.Pod
  )

  const {
    data: heatMapData,
    loading: heatMapLoading,
    error: heatMapError,
  } = useServiceHeatMapQuery({
    variables: { serviceId: serviceId ?? '', flavor: heatMapFlavor },
    skip: !metricsEnabled,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })
  const isLoading =
    !heatMapData && (heatMapLoading || loadingDeploymentSettings)

  const { cpuHeatMap, memoryHeatMap } = useMemo(
    () => ({
      cpuHeatMap:
        heatMapData?.serviceDeployment?.heatMap?.cpu?.filter(isNonNullable) ??
        [],
      memoryHeatMap:
        heatMapData?.serviceDeployment?.heatMap?.memory?.filter(
          isNonNullable
        ) ?? [],
    }),
    [heatMapData?.serviceDeployment?.heatMap]
  )

  return (
    <Flex
      direction="column"
      gap="large"
    >
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
          <CompactSelect
            size="small"
            width={140}
            selectedKey={heatMapFlavor}
            onSelectionChange={(e) => setHeatMapFlavor(e as HeatMapFlavor)}
          >
            {Object.values(HeatMapFlavor)
              .filter((flavor) => flavor !== HeatMapFlavor.Namespace)
              .map((flavor) => (
                <ListBoxItem
                  key={flavor}
                  label={capitalize(flavor)}
                />
              ))}
          </CompactSelect>
        </Flex>
      </Flex>
      {!(heatMapData || isLoading) ? (
        <MetricsCard css={{ padding: spacing.xlarge, flex: 1 }}>
          {heatMapError ? (
            <GqlError
              css={{ width: '100%' }}
              error={heatMapError}
            />
          ) : (
            <EmptyState message="Utilization heatmaps not available." />
          )}
        </MetricsCard>
      ) : (
        <>
          <MetricsCard
            header={{
              content: `memory utilization by ${heatMapFlavor}`,
              outerProps: { style: { flexShrink: 0, height: 'fit-content' } },
            }}
            css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
          >
            {isLoading ? (
              <RectangleSkeleton
                $height="100%"
                $width="100%"
              />
            ) : (
              <UtilizationHeatmap
                colorScheme="blue"
                data={memoryHeatMap}
                flavor={heatMapFlavor}
                utilizationType="memory"
              />
            )}
          </MetricsCard>
          <MetricsCard
            header={{
              content: `cpu utilization by ${heatMapFlavor}`,
              outerProps: { style: { flexShrink: 0, height: 'fit-content' } },
            }}
            css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
          >
            {isLoading ? (
              <RectangleSkeleton
                $height="100%"
                $width="100%"
              />
            ) : (
              <UtilizationHeatmap
                colorScheme="purple"
                data={cpuHeatMap}
                flavor={heatMapFlavor}
                utilizationType="cpu"
              />
            )}
          </MetricsCard>
        </>
      )}
    </Flex>
  )
}

const GROUPINGS = [
  {
    key: ServiceMetricsGrouping.Service,
    label: 'Service',
    icon: <DeploymentIcon size={16} />,
  },
  {
    key: ServiceMetricsGrouping.Pod,
    label: 'Pod',
    icon: <SmallPodIcon size={16} />,
  },
]

function ServiceMetricsTimeseries() {
  const { serviceId } = useParams()
  const timeRange = useTimeRange()
  const [grouping, setGrouping] = useState(ServiceMetricsGrouping.Service)
  const sections = useMemo(() => serviceMetricSections(grouping), [grouping])

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      width="100%"
      minHeight={0}
    >
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
            onSelectionChange={(key) =>
              setGrouping(key as ServiceMetricsGrouping)
            }
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
                <ServiceMetricGraphCard
                  key={`${grouping}-${graph.key}`}
                  serviceId={serviceId}
                  grouping={grouping}
                  graph={graph}
                  timeRange={timeRange}
                />
              ))}
            </MetricsGraphGrid>
          </MetricsSection>
        ))}
      </MetricsScrollSC>
    </Flex>
  )
}

function ServiceMetricGraphCard({
  serviceId,
  grouping,
  graph,
  timeRange,
}: {
  serviceId?: string
  grouping: ServiceMetricsGrouping
  graph: ClusterMetricGraph
  timeRange: TimeRangeState
}) {
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useServiceUsageMetricsQuery({
    variables: {
      serviceId: serviceId ?? '',
      groupBy: grouping,
      ...metricsQueryWindow(timeRange.timeWindow),
      ...usageFieldVariables(graph.fields),
    },
    skip: !serviceId,
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
      metrics={data?.serviceDeployment?.serviceUsageMetrics}
      loading={loading}
      error={error}
      timeRange={timeRange}
    />
  )
}

export { ServiceMetricsHeatmap, ServiceMetricsTimeseries }
