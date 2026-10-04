import {
  EmptyState,
  Flex,
  HeatMapIcon,
  ListBoxItem,
  Select,
  TimeSeriesIcon,
} from '@pluralsh/design-system'
import { MetricsCard } from 'components/utils/metrics/MetricsCard'
import { MetricsScrollSC } from 'components/utils/metrics/MetricsGraphCard'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import {
  HeatMapFlavor,
  useServiceHeatMapQuery,
  useServiceMetricsQuery,
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
import {
  ResourceMetricsGraphs,
  hasResourceMetrics,
} from 'components/utils/metrics/ResourceMetricsGraphs.tsx'

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
          <Select
            width={160}
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
          </Select>
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

function ServiceMetricsTimeseries() {
  const theme = useTheme()
  const { serviceId } = useParams()
  const timeRange = useTimeRange()
  const {
    data: currentData,
    previousData,
    loading,
    error: metricsError,
  } = useServiceMetricsQuery({
    variables: {
      id: serviceId ?? '',
      ...metricsQueryWindow(timeRange.timeWindow),
    },
    skip: !serviceId,
    fetchPolicy: 'cache-and-network',
  })
  const data = useRangeQueryData(
    { data: currentData, previousData },
    timeRange.revision
  )

  const {
    cpu,
    mem,
    podCpu,
    podMem,
    cpuRequests,
    memRequests,
    cpuLimits,
    memLimits,
    podCpuRequests,
    podMemRequests,
    podCpuLimits,
    podMemLimits,
  } = useMemo(() => {
    const {
      cpu,
      mem,
      podCpu,
      podMem,
      cpuRequests,
      memRequests,
      cpuLimits,
      memLimits,
      podCpuRequests,
      podMemRequests,
      podCpuLimits,
      podMemLimits,
    } = data?.serviceDeployment?.serviceMetrics || {}

    return {
      cpu: (cpu || []).filter(isNonNullable),
      mem: (mem || []).filter(isNonNullable),
      podCpu: (podCpu || []).filter(isNonNullable),
      podMem: (podMem || []).filter(isNonNullable),
      cpuRequests: (cpuRequests || []).filter(isNonNullable),
      memRequests: (memRequests || []).filter(isNonNullable),
      cpuLimits: (cpuLimits || []).filter(isNonNullable),
      memLimits: (memLimits || []).filter(isNonNullable),
      podCpuRequests: (podCpuRequests || []).filter(isNonNullable),
      podMemRequests: (podMemRequests || []).filter(isNonNullable),
      podCpuLimits: (podCpuLimits || []).filter(isNonNullable),
      podMemLimits: (podMemLimits || []).filter(isNonNullable),
    }
  }, [data])

  let content = (
    <MetricsCard css={{ padding: theme.spacing.medium }}>
      <EmptyState message="No metrics available" />
    </MetricsCard>
  )

  if (
    hasResourceMetrics({
      cpu,
      mem,
      podCpu,
      podMem,
      cpuRequests,
      memRequests,
      cpuLimits,
      memLimits,
      podCpuRequests,
      podMemRequests,
      podCpuLimits,
      podMemLimits,
    })
  ) {
    content = (
      <ResourceMetricsGraphs
        cpu={cpu}
        mem={mem}
        podCpu={podCpu}
        podMem={podMem}
        cpuRequests={cpuRequests}
        memRequests={memRequests}
        cpuLimits={cpuLimits}
        memLimits={memLimits}
        podCpuRequests={podCpuRequests}
        podMemRequests={podMemRequests}
        podCpuLimits={podCpuLimits}
        podMemLimits={podMemLimits}
        timeWindow={timeRange.timeWindow}
        onRangeSelect={timeRange.selectWindow}
      />
    )
  }

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      width="100%"
      minHeight={0}
    >
      <MetricsTimeRangeControl timeRange={timeRange} />
      <MetricsScrollSC>
        {!data && loading ? (
          <RectangleSkeleton
            $height="100%"
            $width="100%"
          />
        ) : metricsError ? (
          <GqlError error={metricsError} />
        ) : (
          content
        )}
      </MetricsScrollSC>
    </Flex>
  )
}

export { ServiceMetricsHeatmap, ServiceMetricsTimeseries }
