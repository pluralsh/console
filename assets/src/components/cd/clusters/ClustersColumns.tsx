import { useState } from 'react'
import {
  GearTrainIcon,
  ListBoxItem,
  PeopleIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { isEmpty } from 'lodash'
import { Link } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import { ClustersRowFragment } from 'generated/graphql'

import {
  canUpgrade,
  isUpgrading,
  nextSupportedVersion,
  toNiceVersion,
} from 'utils/semver'
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

import ClusterUpgrade from './ClusterUpgrade'
import { ClusterHealth } from './ClusterHealthChip'
import { ClusterConditions } from './ClusterConditions'
import { DynamicClusterIcon } from './DynamicClusterIcon'

export const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()

const ColClusterSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

const ColCluster = columnHelper.accessor(({ node }) => node, {
  id: 'cluster',
  header: 'Cluster',
  cell: function Cell({ getValue }) {
    const cluster = getValue()
    const upgrading =
      !cluster?.self && isUpgrading(cluster?.version, cluster?.currentVersion)

    return (
      <ColClusterSC>
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
      </ColClusterSC>
    )
  },
})

const ColProvider = columnHelper.accessor(
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
        <ColClusterSC>
          <DistroProviderIconFrame
            distro={node?.distro}
            size="medium"
            type="tertiary"
          />
          <StackedText
            first={getClusterDistroName(node?.distro, 'short')}
            second={getProviderName(node?.provider?.cloud)}
          />
        </ColClusterSC>
      )
    },
  }
)

const ColHealth = columnHelper.accessor(({ node }) => node, {
  id: 'health',
  header: 'Health',
  cell: ({ getValue }) => <ClusterHealth cluster={getValue() || undefined} />,
})

const ColVersion = columnHelper.accessor(({ node }) => node, {
  id: 'version',
  header: 'Deployed version',
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
              <TabularNumbers>
                Current: {toNiceVersion(node?.currentVersion)}
              </TabularNumbers>
            }
            second={
              node?.self || !node?.version ? null : (
                <TabularNumbers>{`Target: ${toNiceVersion(
                  node?.version
                )}`}</TabularNumbers>
              )
            }
          />
        )}
        {!node?.currentVersion && <>-</>}
      </div>
    )
  },
})

const ColCpu = columnHelper.accessor(({ node }) => node, {
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

const ColMemory = columnHelper.accessor(({ node }) => node, {
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
const ColStatus = columnHelper.accessor(({ node }) => node, {
  id: 'status',
  header: 'Status',
  cell: ({ table, getValue, row: { original } }) => {
    const cluster = getValue()
    const hasDeprecations = !isEmpty(cluster?.apiDeprecations)
    const upgrade = nextSupportedVersion(
      cluster?.version,
      cluster?.provider?.supportedVersions
    )
    const { refetch } = table.options.meta as { refetch?: () => void }

    if (
      !upgrade &&
      !hasDeprecations &&
      !(!cluster?.provider && canUpgrade(cluster?.currentVersion ?? '0.0.0'))
    ) {
      return null
    }

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

const ColActions = columnHelper.accessor(({ node }) => node, {
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
    const protect = cluster.protect || cluster.self || !!cluster.deletedAt

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
              key={MenuItemKey.Delete}
              leftContent={<TrashCanIcon color={theme.colors['icon-danger']} />}
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

export const columns = [
  ColCluster,
  ColProvider,
  ColHealth,
  ColVersion,
  ColCpu,
  ColMemory,
  ColStatus,
  ColActions,
]
