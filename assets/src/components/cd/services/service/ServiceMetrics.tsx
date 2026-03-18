import {
  Card,
  EmptyState,
  Flex,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { Graph } from 'components/utils/Graph'
import GraphHeader from 'components/utils/GraphHeader'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import RangePicker from 'components/utils/RangePicker'
import { SubTabs } from 'components/utils/SubTabs'
import {
  useLoadingDeploymentSettings,
  useMetricsEnabled,
} from 'components/contexts/DeploymentSettingsContext'
import {
  HeatMapFlavor,
  MetricResponseFragment,
  useServiceHeatMapQuery,
  useServiceMetricsQuery,
} from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import styled, { useTheme } from 'styled-components'

import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { useMemo, useState } from 'react'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'
import { Prometheus } from 'utils/prometheus.ts'
import { dayjsExtended as dayjs, DURATIONS } from 'utils/datetime'

import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { UtilizationHeatmap } from 'components/utils/UtilizationHeatmap'

const HEATMAP_HEIGHT = 350
const METRICS_TABS = [
  { path: 'timeseries', label: 'Timeseries' },
  { path: 'heatmap', label: 'Heat map' },
]

export function ServiceMetrics() {
  const metricsEnabled = useMetricsEnabled()
  const loadingDeploymentSettings = useLoadingDeploymentSettings()

  if (!(metricsEnabled || loadingDeploymentSettings)) {
    return <EmptyState message="Metrics are not enabled." />
  }

  return (
    <WrapperSC>
      <SubTabs directory={METRICS_TABS} />
      <Outlet context={{ metricsEnabled, loadingDeploymentSettings }} />
    </WrapperSC>
  )
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

const convertVals = (values) =>
  values.map(({ timestamp, value }) => ({
    x: new Date(timestamp * 1000),
    y: parseFloat(value),
  }))

function Graphs({
  cpu: [cpu],
  mem: [mem],
}: {
  cpu: MetricResponseFragment[]
  mem: MetricResponseFragment[]
}) {
  const theme = useTheme()

  const { cpuValues, memValues } = useMemo(
    () => ({
      cpuValues: cpu?.values ? convertVals(cpu?.values) : null,
      memValues: mem?.values ? convertVals(mem?.values) : null,
    }),
    [cpu, mem]
  )

  if (!memValues && !cpuValues) {
    return null
  }

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        flexGrow: 1,
        height: 320,
        padding: theme.spacing.large,
      }}
    >
      {cpuValues && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Overall CPU Usage (cores)" />
          <Graph
            data={[{ id: 'cpu', data: cpuValues }]}
            yFormat={(v) => Prometheus.format(v, 'cpu')}
            tickRotation={undefined}
          />
        </div>
      )}
      {memValues && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Overall Memory Usage (bytes)" />
          <Graph
            data={[{ id: 'memory', data: memValues }]}
            yFormat={(v) => Prometheus.format(v, 'memory')}
            tickRotation={undefined}
          />
        </div>
      )}
    </div>
  )
}

function PodGraphs({
  cpu,
  mem,
}: {
  cpu: MetricResponseFragment[]
  mem: MetricResponseFragment[]
}) {
  const theme = useTheme()
  const { cpuGraph, memGraph } = useMemo(() => {
    const cpuGraph = cpu.map(({ metric, values }) => ({
      id: (metric as any)?.pod,
      data: convertVals(values),
    }))
    const memGraph = mem.map(({ metric, values }) => ({
      id: (metric as any)?.pod,
      data: convertVals(values),
    }))

    return { cpuGraph, memGraph }
  }, [cpu, mem])

  if (!memGraph && !cpuGraph) {
    return null
  }

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        flexGrow: 1,
        height: 320,
        padding: theme.spacing.large,
      }}
    >
      {!isEmpty(cpuGraph) && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Pod CPU Usage (cores)" />
          <Graph
            data={cpuGraph}
            yFormat={(v) => Prometheus.format(v, 'cpu')}
            tickRotation={undefined}
          />
        </div>
      )}
      {!isEmpty(memGraph) && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Pod Memory Usage (bytes)" />
          <Graph
            data={memGraph}
            yFormat={(v) => Prometheus.format(v, 'memory')}
            tickRotation={undefined}
          />
        </div>
      )}
    </div>
  )
}

function ServiceMetricsTimeseries() {
  const theme = useTheme()
  const { serviceId } = useParams()
  const [duration, setDuration] = useState<any>(DURATIONS[0])

  const start = useMemo(
    () => dayjs().subtract(duration.offset, 'second').toISOString(),
    [duration.offset]
  )
  const {
    data,
    loading,
    error: metricsError,
  } = useServiceMetricsQuery({
    variables: {
      id: serviceId ?? '',
      step: duration.step,
      start,
    },
    skip: !serviceId,
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

  const { cpu, mem, podCpu, podMem } = useMemo(() => {
    const { cpu, mem, podCpu, podMem } =
      data?.serviceDeployment?.serviceMetrics || {}

    return {
      cpu: (cpu || []).filter(isNonNullable),
      mem: (mem || []).filter(isNonNullable),
      podCpu: (podCpu || []).filter(isNonNullable),
      podMem: (podMem || []).filter(isNonNullable),
    }
  }, [data])

  let content = <EmptyState message="No metrics available" />

  if (!isEmpty(cpu) || !isEmpty(mem) || !isEmpty(podCpu) || !isEmpty(podMem)) {
    content = (
      <>
        <Graphs
          cpu={cpu}
          mem={mem}
        />
        <PodGraphs
          cpu={podCpu}
          mem={podMem}
        />
      </>
    )
  }

  if (loading && !data) return <LoadingIndicator />

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      width="100%"
      overflow="hidden"
    >
      <RangePicker
        duration={duration}
        setDuration={setDuration}
        position="sticky"
        top={0}
      />
      {metricsError ? (
        <GqlError error={metricsError} />
      ) : (
        <Card
          css={{
            padding: theme.spacing.medium,
            overflow: 'auto',
            gap: theme.spacing.small,
            maxHeight: '100%',
          }}
        >
          {content}
        </Card>
      )}
    </Flex>
  )
}

export { ServiceMetricsHeatmap, ServiceMetricsTimeseries }

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
}))
