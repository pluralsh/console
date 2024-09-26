import { useOutletContext } from 'react-router-dom'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { Cluster } from 'generated/graphql'
import { isEmpty } from 'lodash'

import {
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
  columnHelper,
} from '../../cluster/nodes/NodesList'
import { TableCaretLink } from '../../cluster/TableElements'
import { getNodeDetailsPath } from '../../../routes/cdRoutesConsts'
import { useDeploymentSettings } from '../../contexts/DeploymentSettingsContext'
import { ClusterMetrics } from '../../cluster/nodes/ClusterMetrics'

export const ColActions = (clusterId?: string) =>
  columnHelper.accessor(() => null, {
    id: 'actions',
    cell: ({ row: { original } }) => (
      <TableCaretLink
        to={getNodeDetailsPath({
          clusterId,
          name: original?.name,
        })}
        textValue={`View node ${original?.name}`}
      />
    ),
    header: '',
  })

export default function ClusterNodes() {
  const theme = useTheme()
  const metricsEnabled =
    !!useDeploymentSettings()?.prometheusConnection ?? false
  const { cluster } = useOutletContext() as { cluster: Cluster }

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
      ColActions(cluster?.id),
    ],
    [cluster]
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      {!isEmpty(cluster.nodes) && metricsEnabled && (
        <ClusterMetrics
          nodes={cluster?.nodes?.filter((node): boolean => !!node) || []}
          cluster={cluster}
        />
      )}
      <NodesList
        nodes={cluster?.nodes || []}
        nodeMetrics={cluster?.nodeMetrics || []}
        columns={columns}
        linkBasePath={getNodeDetailsPath({
          clusterId: cluster?.id,
          name: '',
          isRelative: false,
        })}
      />
    </div>
  )
}
