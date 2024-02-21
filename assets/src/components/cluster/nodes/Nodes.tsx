import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { sumBy } from 'lodash'
import { Flex } from 'honorable'
import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import type { Node, NodeMetric } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ColumnDef } from '@tanstack/react-table'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

import { SHORT_POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import { ClusterMetrics } from './ClusterMetrics'
import {
  ColActions,
  ColCpuTotal,
  ColCpuUsage,
  ColMemoryTotal,
  ColMemoryUsage,
  ColName,
  ColRegion,
  ColStatus,
  ColZone,
  NodesList,
  TableData,
} from './NodesList'

export type ResourceUsage = {
  cpu: number
  mem: number
} | null

const breadcrumbs = [{ label: 'nodes', url: '/nodes' }]

export default function Nodes() {
  useSetBreadcrumbs(breadcrumbs)
  const { prometheusConnection } = useDeploymentSettings()

  const { data, refetch } = useQuery<{
    nodes: Node[]
    nodeMetrics: NodeMetric[]
  }>(NODES_Q, {
    pollInterval: SHORT_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const usage: ResourceUsage = useMemo(() => {
    if (!data) {
      return null
    }
    const cpu = sumBy(
      data.nodeMetrics,
      (metrics) => cpuParser(metrics?.usage?.cpu) ?? 0
    )
    const mem = sumBy(
      data.nodeMetrics,
      (metrics) => memoryParser((metrics as any)?.usage?.memory) ?? 0
    )

    return { cpu, mem }
  }, [data])

  // Memoize columns to prevent rerendering entire table
  const columns: ColumnDef<TableData, any>[] = useMemo(
    () => [
      ColName,
      ColRegion,
      ColZone,
      ColCpuUsage,
      ColMemoryUsage,
      ColCpuTotal,
      ColMemoryTotal,
      ColStatus,
      ColActions(refetch),
    ],
    [refetch]
  )

  return (
    <ResponsivePageFullWidth heading="Nodes">
      {!data ? (
        <LoadingIndicator />
      ) : (
        <Flex
          direction="column"
          gap="xlarge"
        >
          {!!prometheusConnection && (
            <Card padding="xlarge">
              <ClusterMetrics
                nodes={data.nodes}
                usage={usage}
              />
            </Card>
          )}
          <NodesList
            nodes={data.nodes}
            nodeMetrics={data.nodeMetrics}
            columns={columns}
          />
        </Flex>
      )}
    </ResponsivePageFullWidth>
  )
}
