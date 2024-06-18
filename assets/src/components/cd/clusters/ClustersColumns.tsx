import { useState } from 'react'
import {
  GearTrainIcon,
  ListBoxItem,
  PeopleIcon,
  ReturnIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import { Cluster, ClustersRowFragment } from 'generated/graphql'

import { isUpgrading, toNiceVersion } from 'utils/semver'
import { Edge } from 'utils/graphql'
import {
  cpuFormat,
  cpuParser,
  memoryFormat,
  memoryParser,
} from 'utils/kubernetes'

import { getProviderName } from 'components/utils/Provider'
import {
  DistroProviderIconFrame,
  getClusterDistroName,
} from 'components/utils/ClusterDistro'
import { MoreMenu } from 'components/utils/MoreMenu'
import { BasicLink } from 'components/utils/typography/BasicLink'
import { StackedText } from 'components/utils/table/StackedText'
import { UsageBar } from 'components/cluster/nodes/UsageBar'
import { TableText, TabularNumbers } from 'components/cluster/TableElements'
import { roundToTwoPlaces } from 'components/cluster/utils'

import { DeleteClusterModal } from '../providers/DeleteCluster'
import { ClusterPermissionsModal } from '../cluster/ClusterPermissions'
import { ClusterSettingsModal } from '../cluster/ClusterSettings'

import { DetachClusterModal } from '../providers/DetachCluster'

import ClusterUpgrade from './ClusterUpgrade'
import { ClusterHealth } from './ClusterHealthChip'
import { ClusterConditions } from './ClusterConditions'
import { DynamicClusterIcon } from './DynamicClusterIcon'

export const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()

export const ColClusterContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

export function ColClusterContent({
  cluster,
}: {
  cluster: Nullable<
    Pick<
      Cluster,
      | 'id'
      | 'name'
      | 'version'
      | 'currentVersion'
      | 'protect'
      | 'self'
      | 'deletedAt'
      | 'handle'
    >
  >
}) {
  if (!cluster) {
    return null
  }
  const upgrading =
    !cluster?.self && isUpgrading(cluster?.version, cluster?.currentVersion)

  return (
    <ColClusterContentSC>
      <DynamicClusterIcon
        deleting={!!cluster?.deletedAt}
        upgrading={upgrading}
        protect={!!cluster?.protect}
        self={!!cluster?.self}
      />
      <StackedText
        first={
          <BasicLink
            as={Link}
            to={`/cd/clusters/${cluster?.id}`}
            css={{ whiteSpace: 'nowrap' }}
          >
            {cluster?.name}
          </BasicLink>
        }
        second={`handle: ${cluster?.handle}`}
      />
    </ColClusterContentSC>
  )
}

export const ColCluster = columnHelper.accessor(({ node }) => node?.name, {
  id: 'cluster',
  header: 'Cluster',
  cell: function Cell({ row: { original } }) {
    return <ColClusterContent cluster={original.node} />
  },
})

export const ColProvider = columnHelper.accessor(
  ({ node }) =>
    `${getClusterDistroName(node?.distro, 'short')} – ${getProviderName(
      node?.provider?.cloud
    )}`,
  {
    id: 'provider',
    header: 'Provider',
    cell: function Cell({
      row: {
        original: { node },
      },
    }) {
      return (
        <ColClusterContentSC>
          <DistroProviderIconFrame
            distro={node?.distro}
            provider={node?.provider?.cloud}
            size="medium"
            type="secondary"
          />
          <StackedText
            first={getClusterDistroName(node?.distro, 'short')}
            second={getProviderName(node?.provider?.cloud)}
          />
        </ColClusterContentSC>
      )
    },
  }
)

export const ColHealth = columnHelper.accessor(({ node }) => node, {
  id: 'health',
  header: 'Health',
  cell: ({ getValue }) => <ClusterHealth cluster={getValue() || undefined} />,
})

export const ColVersion = columnHelper.accessor(({ node }) => node, {
  id: 'version',
  header: 'Version',
  cell: function Cell({
    row: {
      original: { node },
    },
  }) {
    return (
      <div>
        {node?.currentVersion && (
          <StackedText
            first={
              <div css={{ display: 'flex', flexDirection: 'column' }}>
                <TabularNumbers>
                  Current: {toNiceVersion(node?.currentVersion)}
                </TabularNumbers>
                <TabularNumbers>
                  {node?.self || !node?.version
                    ? null
                    : `Target: ${toNiceVersion(node?.version)}`}
                </TabularNumbers>
              </div>
            }
            second={`Kubelet: ${toNiceVersion(node?.kubeletVersion)}`}
          />
        )}
        {!node?.currentVersion && <>-</>}
      </div>
    )
  },
})

export const ColCpu = columnHelper.accessor(({ node }) => node, {
  id: 'cpu',
  header: 'CPU',
  cell: ({ getValue }) => {
    const cluster = getValue()
    const usage = cluster?.nodeMetrics?.reduce(
      (acc, current) => acc + (cpuParser(current?.usage?.cpu) ?? 0),
      0
    )
    const capacity = cluster?.nodes?.reduce(
      (acc, current) =>
        // @ts-ignore
        acc + (cpuParser(current?.status?.capacity?.cpu) ?? 0),
      0
    )
    const display = `${usage ? cpuFormat(roundToTwoPlaces(usage)) : '—'} / ${
      capacity ? cpuFormat(capacity) : '—'
    }`

    return usage !== undefined && !!capacity ? (
      <Tooltip
        label={display}
        placement="top"
      >
        <TableText>
          <UsageBar
            usage={usage / capacity}
            width={120}
          />
        </TableText>
      </Tooltip>
    ) : (
      display
    )
  },
})

export const ColMemory = columnHelper.accessor(({ node }) => node, {
  id: 'memory',
  header: 'Memory',
  cell: ({ getValue }) => {
    const cluster = getValue()
    const usage = cluster?.nodeMetrics?.reduce(
      (acc, current) => acc + (memoryParser(current?.usage?.memory) ?? 0),
      0
    )
    const capacity = cluster?.nodes?.reduce(
      (acc, current) =>
        // @ts-ignore
        acc + (memoryParser(current?.status?.capacity?.memory) ?? 0),
      0
    )

    const display = `${usage ? memoryFormat(usage) : '—'} / ${
      capacity ? memoryFormat(capacity) : '—'
    }`

    return usage !== undefined && !!capacity ? (
      <Tooltip
        label={display}
        placement="top"
      >
        <TableText>
          <UsageBar
            usage={usage / capacity}
            width={120}
          />
        </TableText>
      </Tooltip>
    ) : (
      display
    )
  },
})

const ColStatusSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
}))

export const ColStatus = columnHelper.accessor(({ node }) => node, {
  id: 'status',
  header: 'Status',
  meta: {
    gridTemplate: 'min-content',
  },
  cell: ({ table, getValue, row: { original } }) => {
    const cluster = getValue()
    const { refetch } = table.options.meta as { refetch?: () => void }

    return (
      <ColStatusSC
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <ClusterUpgrade
          cluster={cluster}
          refetch={refetch}
        />
        <ClusterConditions cluster={original.node} />
      </ColStatusSC>
    )
  },
})

enum MenuItemKey {
  Permissions = 'permissions',
  Delete = 'delete',
  Detach = 'detach',
  Settings = 'Settings',
}

/*
const ColConditions = columnHelper.accessor(
  ({ node }) => node?.status?.conditions?.length ?? 0,
  {
    id: 'conditions',
    header: 'Conditions',
    cell: ({ row: { original } }) =>
      original?.node?.status?.conditions && (
        <div onClick={(e) => e.stopPropagation()}>
          <ClusterConditions cluster={original.node} />
        </div>
      ),
  }
)
*/

export const ColActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  cell: function Cell({ table, getValue }) {
    const theme = useTheme()
    const cluster = getValue()
    const { refetch } = table.options.meta as { refetch?: () => void }
    const [menuKey, setMenuKey] = useState<Nullable<string>>('')

    if (!cluster) {
      return null
    }
    const protect = cluster.protect || cluster.self

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        css={{ alignItems: 'center', alignSelf: 'end', display: 'flex' }}
      >
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key={MenuItemKey.Permissions}
            leftContent={<PeopleIcon />}
            label="Permissions"
            textValue="Permissions"
          />
          <ListBoxItem
            key={MenuItemKey.Settings}
            leftContent={<GearTrainIcon />}
            label="Settings"
            textValue="Settings"
          />
          {!protect && (
            <ListBoxItem
              key={MenuItemKey.Detach}
              leftContent={
                <ReturnIcon color={theme.colors['icon-danger-critical']} />
              }
              label="Detach cluster"
              textValue="Detach cluster"
            />
          )}
          {!protect && !cluster.deletedAt && (
            <ListBoxItem
              key={MenuItemKey.Delete}
              leftContent={
                <TrashCanIcon color={theme.colors['icon-danger-critical']} />
              }
              label="Delete cluster"
              textValue="Delete cluster"
            />
          )}
        </MoreMenu>
        {/* Modals */}
        <DeleteClusterModal
          cluster={cluster}
          refetch={refetch}
          open={menuKey === MenuItemKey.Delete}
          onClose={() => setMenuKey('')}
        />
        <DetachClusterModal
          cluster={cluster}
          refetch={refetch}
          open={menuKey === MenuItemKey.Detach}
          onClose={() => setMenuKey('')}
        />
        <ClusterPermissionsModal
          cluster={cluster}
          open={menuKey === MenuItemKey.Permissions}
          onClose={() => setMenuKey('')}
        />
        <ClusterSettingsModal
          cluster={cluster}
          open={menuKey === MenuItemKey.Settings}
          onClose={() => setMenuKey('')}
        />
      </div>
    )
  },
})

export const cdClustersColumns = [
  ColCluster,
  ColProvider,
  ColHealth,
  ColVersion,
  ColCpu,
  ColMemory,
  ColStatus,
  ColActions,
]
