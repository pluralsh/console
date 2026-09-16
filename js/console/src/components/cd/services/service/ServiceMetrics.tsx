import {
  Card,
  EmptyState,
  Flex,
  HeatMapIcon,
  ListBoxItem,
  Select,
  TimeSeriesIcon,
} from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import RangePicker from 'components/utils/RangePicker'
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
import { DURATIONS, getMetricQueryStep } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { useMetricsQueryStart } from 'components/hooks/useMetricsQueryStart'
import { ResourceMetricsGraphs, hasResourceMetrics } from 'components/utils/metrics/ResourceMetricsGraphs.tsx'

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
        <Card css={{ padding: spacing.xlarge, flex: 1 }}>
          {heatMapError ? (
            <GqlError
              css={{ width: '100%' }}
              error={heatMapError}
            />
          ) : (
            <EmptyState message="Utilization heatmaps not available." />
          )}
        </Card>
      ) : (
        <>
          <Card
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
          </Card>
          <Card
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
          </Card>
        </>
      )}
    </Flex>
  )
}

function ServiceMetricsTimeseries() {
  const theme = useTheme()
  const { serviceId } = useParams()
  const [duration, setDuration] = useState<any>(DURATIONS[0])
  const start = useMetricsQueryStart(duration.offset)
  const {
    data,
    loading,
    error: metricsError,
  } = useServiceMetricsQuery({
    variables: {
      id: serviceId ?? '',
      step: getMetricQueryStep(duration.offset),
      start,
    },
    skip: !serviceId,
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

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

  let content = <EmptyState message="No metrics available" />

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
      />
    )
  }

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
      width="100%"
      overflow="auto"
    >
      <RangePicker
        duration={duration}
        setDuration={setDuration}
        position="sticky"
        top={0}
      />
      {!data && loading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : metricsError ? (
        <GqlError error={metricsError} />
      ) : (
        <Card css={{ padding: theme.spacing.medium }}>{content}</Card>
      )}
    </Flex>
  )
}

export { ServiceMetricsHeatmap, ServiceMetricsTimeseries }
