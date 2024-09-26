import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { Flex } from 'honorable'
import { Card, useSetBreadcrumbs } from '@pluralsh/design-system'
import type { Node, NodeMetric } from 'generated/graphql'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ColumnDef } from '@tanstack/react-table'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

import { useTheme } from 'styled-components'

import { SHORT_POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import { useCluster } from '../../kubernetes/Cluster'

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
  const theme = useTheme()
  const { prometheusConnection } = useDeploymentSettings()

  const { data, refetch } = useQuery<{
    nodes: Node[]
    nodeMetrics: NodeMetric[]
  }>(NODES_Q, {
    pollInterval: SHORT_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

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
          {!!prometheusConnection && <ClusterMetrics nodes={data.nodes} />}
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
