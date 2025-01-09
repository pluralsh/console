import { Flex } from 'honorable'
import {
  ClusterFragment,
  ClusterNodeFragment,
  Maybe,
  useClusterMetricsQuery,
} from 'generated/graphql'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { Card } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { isNull } from 'lodash'

import { Prometheus } from '../../../utils/prometheus'
import LoadingIndicator from '../../utils/LoadingIndicator'

import { ClusterGauges } from './ClusterGauges'
import { SaturationGraphs } from './SaturationGraphs'

export function ClusterMetrics({
  nodes,
  cluster,
}: {
  nodes: Maybe<ClusterNodeFragment>[]
  cluster?: ClusterFragment
}) {
  const theme = useTheme()
  const { prometheusConnection } = useDeploymentSettings()
  const metricsEnabled = Prometheus.enabled(prometheusConnection)
  const { data, loading } = useClusterMetricsQuery({
    variables: {
      clusterId: cluster?.id ?? '',
    },
    skip: !metricsEnabled || !cluster?.id,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const cpuTotal = Prometheus.capacity(Prometheus.CapacityType.CPU, ...nodes)
  const memTotal = Prometheus.capacity(Prometheus.CapacityType.Memory, ...nodes)
  const podsTotal = Prometheus.capacity(Prometheus.CapacityType.Pods, ...nodes)
  const shouldRenderMetrics =
    metricsEnabled &&
    !isNull(cpuTotal) &&
    !isNull(memTotal) &&
    !!cluster?.id &&
    (data?.cluster?.clusterMetrics?.cpuUsage?.length ?? 0) > 0

  if (loading) return <LoadingIndicator />
  if (!shouldRenderMetrics) return null

  return (
    <Card css={{ padding: theme.spacing.xlarge }}>
      <Flex
        flex={false}
        direction="column"
        gap="xlarge"
        align="center"
      >
        <Flex
          flex={false}
          flexDirection="row"
          alignItems="stretch"
          justifyContent="center"
          width="100%"
          gap="xsmall"
          overflow="visible"
          wrap="wrap"
        >
          <ClusterGauges
            cpu={{
              usage: Prometheus.toValues(
                data?.cluster?.clusterMetrics?.cpuUsage
              ),
              requests: Prometheus.toValues(
                data?.cluster?.clusterMetrics?.cpuRequests
              ),
              limits: Prometheus.toValues(
                data?.cluster?.clusterMetrics?.cpuLimits
              ),
              total: cpuTotal!,
            }}
            memory={{
              usage: Prometheus.toValues(
                data?.cluster?.clusterMetrics?.memoryUsage
              ),
              requests: Prometheus.toValues(
                data?.cluster?.clusterMetrics?.memoryRequests
              ),
              limits: Prometheus.toValues(
                data?.cluster?.clusterMetrics?.memoryLimits
              ),
              total: memTotal!,
            }}
            pods={{
              used: Prometheus.toValues(data?.cluster?.clusterMetrics?.pods),
              total: podsTotal!,
            }}
          />
          <SaturationGraphs
            cpuUsage={Prometheus.toValues(
              data?.cluster?.clusterMetrics?.cpuUsage
            )}
            cpuTotal={cpuTotal!}
            memUsage={Prometheus.toValues(
              data?.cluster?.clusterMetrics?.memoryUsage
            )}
            memTotal={memTotal!}
          />
        </Flex>
      </Flex>
    </Card>
  )
}
