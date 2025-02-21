import { Card, Flex } from '@pluralsh/design-system'
import { Node, useClusterNodeMetricsQuery } from 'generated/graphql'
import { isNull } from 'lodash'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'

import { Prometheus } from '../../../utils/prometheus'
import { useDeploymentSettings } from '../../contexts/DeploymentSettingsContext'
import LoadingIndicator from '../../utils/LoadingIndicator'
import RadialBarChart from '../../utils/RadialBarChart'
import { GaugeWrap, ResourceGauge } from '../Gauges'
import { getAllContainersFromPods } from '../utils'

import { getPodResources } from '../../cd/cluster/pod/getPodResources.tsx'
import { SaturationGraphs } from './SaturationGraphs'

export function NodeGraphs({
  name,
  clusterId,
  node,
}: {
  name?: string
  clusterId?: string
  node: Node
}) {
  const theme = useTheme()
  const { prometheusConnection } = useDeploymentSettings()
  const metricsEnabled = Prometheus.enabled(prometheusConnection)
  const { data, loading } = useClusterNodeMetricsQuery({
    variables: {
      clusterId: clusterId ?? '',
      node: name ?? '',
    },
    skip: !metricsEnabled || !clusterId || !name,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const cpuTotal = Prometheus.capacity(Prometheus.CapacityType.CPU, node)
  const memTotal = Prometheus.capacity(Prometheus.CapacityType.Memory, node)
  const podsTotal = Prometheus.capacity(Prometheus.CapacityType.Pods, node)
  const shouldRenderMetrics =
    metricsEnabled &&
    !isNull(cpuTotal) &&
    !isNull(memTotal) &&
    !!clusterId &&
    (data?.cluster?.clusterNodeMetrics?.cpuUsage?.length ?? 0) > 0

  const { cpu: cpuReservations, memory: memoryReservations } = useMemo(() => {
    const allContainers = getAllContainersFromPods(node?.pods)

    return getPodResources(allContainers)
  }, [node?.pods])

  const chartData = useMemo(() => {
    const cpuUsed = Prometheus.toValues(
      data?.cluster?.clusterNodeMetrics?.cpuUsage
    )
    const memUsed = Prometheus.toValues(
      data?.cluster?.clusterNodeMetrics?.memoryUsage
    )
    const podsUsed = node?.pods?.length ?? 0

    return {
      cpu: {
        used: Prometheus.avg(cpuUsed),
        total: cpuTotal!,
        ...cpuReservations,
      },
      memory: {
        used: Prometheus.avg(memUsed),
        total: memTotal!,
        ...memoryReservations,
      },
      pods: {
        used: podsUsed,
        total: podsTotal!,
        remainder: podsTotal! - podsUsed,
      },
    }
  }, [
    cpuReservations,
    cpuTotal,
    data?.cluster?.clusterNodeMetrics?.cpuUsage,
    data?.cluster?.clusterNodeMetrics?.memoryUsage,
    memTotal,
    memoryReservations,
    node?.pods?.length,
    podsTotal,
  ])

  if (loading) return <LoadingIndicator />
  if (!chartData) return null
  if (!shouldRenderMetrics) return null

  return (
    <Card css={{ padding: theme.spacing.xlarge }}>
      <Flex
        align="center"
        justifyContent="center"
        width="100%"
        gap="medium"
      >
        <GaugeWrap
          heading="CPU Reservation"
          width="auto"
          height="auto"
        >
          <ResourceGauge
            {...chartData.cpu}
            type="cpu"
          />
        </GaugeWrap>
        <GaugeWrap
          heading="Memory Reservation"
          width="auto"
          height="auto"
        >
          <ResourceGauge
            {...chartData.memory}
            type="memory"
          />
        </GaugeWrap>
        <GaugeWrap
          heading="Pods"
          width="auto"
          height="auto"
        >
          <RadialBarChart
            data={[
              {
                id: 'Pod usage',
                data: [
                  {
                    x: 'Pods used',
                    y: chartData.pods.used,
                  },
                  {
                    x: 'Pods available',
                    y: chartData.pods.remainder,
                  },
                ],
              },
            ]}
            centerLabel="Used"
            centerVal={`${Math.round(
              (chartData.pods.used / chartData.pods.total) * 100
            )}%`}
          />
        </GaugeWrap>
        <SaturationGraphs
          cpuUsage={Prometheus.toValues(
            data?.cluster?.clusterNodeMetrics?.cpuUsage
          )}
          cpuTotal={cpuTotal!}
          memUsage={Prometheus.toValues(
            data?.cluster?.clusterNodeMetrics?.memoryUsage
          )}
          memTotal={memTotal!}
        />
      </Flex>
    </Card>
  )
}
