import {
  Chip,
  Flex,
  GearTrainIcon,
  ListBoxItem,
  PeopleIcon,
  ReturnIcon,
  SemanticColorKey,
  SmallAZIcon,
  SmallNamespaceIcon,
  SmallNodeIcon,
  SmallPodIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { SortingFn } from '@tanstack/table-core'
import {
  TableCaretLink,
  TableText,
  TabularNumbers,
} from 'components/cluster/TableElements'
import { roundTo } from 'components/cluster/utils.tsx'
import {
  DistroProviderIconFrame,
  getClusterDistroName,
} from 'components/utils/ClusterDistro'
import { MoreMenu } from 'components/utils/MoreMenu'
import { getProviderName } from 'components/utils/Provider'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate.ts'
import { BasicLink } from 'components/utils/typography/BasicLink'
import { filesize } from 'filesize'

import { ClusterBasicFragment, ClustersRowFragment } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import semver from 'semver'
import styled, { useTheme } from 'styled-components'
import { DefaultTheme } from 'styled-components/dist/types'
import { Edge } from 'utils/graphql'

import { isUpgrading, toNiceVersion } from 'utils/semver'
import { getClusterDetailsPath } from '../../../routes/cdRoutesConsts.tsx'
import { AiInsightSummaryIcon } from '../../utils/AiInsights.tsx'

import { UsageBar } from '../../utils/UsageBar.tsx'
import { ClusterPermissionsModal } from '../cluster/ClusterPermissions'
import { ClusterSettingsModal } from '../cluster/ClusterSettings'
import { DeleteClusterModal } from '../providers/DeleteCluster'
import { DetachClusterModal } from '../providers/DetachCluster'
import {
  ClusterHealth,
  ClusterHealthScoreChip,
  isClusterHealthy,
} from './ClusterHealthChip'
import { ClustersTableMeta } from './Clusters.tsx'
import { ClusterUpgradeButton } from './ClusterUpgradeButton.tsx'
import { DynamicClusterIcon } from './DynamicClusterIcon'
import { ClusterInfoFlyoverTab } from './info-flyover/ClusterInfoFlyover.tsx'

export const columnHelper = createColumnHelper<Edge<ClustersRowFragment>>()

export const ColClusterContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

export function ColClusterContent({
  cluster,
}: {
  cluster: Nullable<ClusterBasicFragment>
}) {
  const theme = useTheme()

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
        virtual={!!cluster?.virtual}
      />
      <StackedText
        first={
          <>
            <BasicLink
              as={Link}
              to={`/cd/clusters/${cluster?.id}`}
              css={{ whiteSpace: 'nowrap' }}
            >
              {cluster?.name}
            </BasicLink>
            {cluster?.virtual && (
              <Chip
                size="small"
                css={{ marginLeft: theme.spacing.xxsmall }}
              >
                virtual
              </Chip>
            )}
          </>
        }
        second={`handle: ${cluster?.handle}`}
      />
    </ColClusterContentSC>
  )
}

export const ColCluster = columnHelper.accessor(({ node }) => node?.name, {
  id: 'cluster',
  header: 'Cluster',
  meta: { gridTemplate: '1fr' },
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
          {getClusterDistroName(node?.distro, 'short')}
        </ColClusterContentSC>
      )
    },
  }
)

const sortVersionFn: SortingFn<Edge<ClustersRowFragment>> = (
  rowA,
  rowB,
  _columnId
) => {
  const a = semver.coerce(rowA.original.node?.currentVersion)
  const b = semver.coerce(rowB.original.node?.currentVersion)

  if (!a && !b) return 0

  if (!a) return -1

  if (!b) return 1

  return a.compare(b)
}

export const ColVersion = columnHelper.accessor(
  ({ node }) => toNiceVersion(node?.currentVersion),
  {
    id: 'version',
    header: 'Version',
    enableSorting: true,
    sortingFn: sortVersionFn,
    cell: function Cell({
      row: {
        original: { node },
      },
    }) {
      return (
        <div>
          {node?.currentVersion && (
            <StackedText
              truncate={true}
              first={
                <div css={{ display: 'flex', flexDirection: 'column' }}>
                  <TabularNumbers>
                    Control Plane: {toNiceVersion(node?.currentVersion)}
                  </TabularNumbers>
                  <TabularNumbers>
                    {node?.self || !node?.version
                      ? null
                      : `Target: ${toNiceVersion(node?.version)}`}
                  </TabularNumbers>
                </div>
              }
              second={
                <span style={{ ...TRUNCATE }}>
                  {`Kubelet: ${toNiceVersion(node?.kubeletVersion)}`}
                </span>
              }
            />
          )}
          {!node?.currentVersion && <>-</>}
        </div>
      )
    },
  }
)

const cpuFormat = (cpu: Nullable<number>) => (cpu ? cpu : '—')

export const ColCpu = columnHelper.accessor(({ node }) => node, {
  id: 'cpu',
  header: 'CPU',
  cell: ({ getValue }) => {
    const cluster = getValue()
    const percentage = (cluster?.cpuUtil ?? 0) / 100
    const total = (cluster?.cpuTotal ?? 0) / 1000
    const display = `${cpuFormat(roundTo(percentage * total, 2))} / ${cpuFormat(total)} ${total > 0 ? 'vCPU' : ''}`

    return percentage > 0 ? (
      <>
        <SizeTextSc>{display}</SizeTextSc>
        <UsageBar
          usage={percentage}
          width={100}
        />
      </>
    ) : (
      display
    )
  },
})

const memFormat = (memory: Nullable<number>) =>
  memory ? filesize(memory, { standard: 'jedec' }) : '—'

export const ColMemory = columnHelper.accessor(({ node }) => node, {
  id: 'memory',
  header: 'Memory',
  cell: ({ getValue }) => {
    const cluster = getValue()
    const percentage = (cluster?.memoryUtil ?? 0) / 100
    const total = cluster?.memoryTotal ?? 0
    const display = `${memFormat(percentage * total)} / ${memFormat(total)}`

    return percentage > 0 ? (
      <>
        <SizeTextSc>{display}</SizeTextSc>
        <TableText>
          <UsageBar
            usage={percentage}
            width={100}
          />
        </TableText>
      </>
    ) : (
      display
    )
  },
})

type PartialType = keyof DefaultTheme['partials']['text']

const SizeTextSc = styled.div<{
  $partialType?: PartialType
  $color?: SemanticColorKey
}>(({ theme, $partialType = 'caption', $color = 'text-xlight' }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  color: theme.colors[$color],
  ...theme.partials.text[$partialType],
}))

function ColClusterSizeContent({
  cluster,
}: {
  cluster: Nullable<ClustersRowFragment>
}) {
  const theme = useTheme()
  const isEmpty = useMemo(() => {
    return (
      !cluster?.nodeCount &&
      !cluster?.podCount &&
      !cluster?.namespaceCount &&
      !cluster?.availabilityZones
    )
  }, [cluster])

  return isEmpty ? (
    <>—</>
  ) : (
    <div
      css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, min-content)',
        gap: theme.spacing.xxsmall,
      }}
    >
      {cluster?.nodeCount ? (
        <Chip
          size="small"
          tooltip={`${cluster?.nodeCount} nodes`}
          icon={<SmallNodeIcon />}
        >
          {cluster?.nodeCount}
        </Chip>
      ) : null}
      {cluster?.podCount ? (
        <Chip
          size="small"
          tooltip={`${cluster?.podCount} pods`}
          icon={<SmallPodIcon />}
        >
          {cluster?.podCount}
        </Chip>
      ) : null}
      {cluster?.namespaceCount ? (
        <Chip
          size="small"
          tooltip={`${cluster?.namespaceCount} namespaces`}
          icon={<SmallNamespaceIcon />}
        >
          {cluster?.namespaceCount}
        </Chip>
      ) : null}
      {cluster?.availabilityZones ? (
        <Chip
          size="small"
          tooltip={`availability zones: ${cluster?.availabilityZones?.join(', ')}`}
          icon={<SmallAZIcon />}
        >
          {cluster?.availabilityZones?.length}
        </Chip>
      ) : null}
    </div>
  )
}

export const ColClusterSize = columnHelper.accessor(({ node }) => node, {
  id: 'size',
  header: 'Cluster Size',
  cell: ({ row: { original } }) => (
    <ColClusterSizeContent cluster={original.node} />
  ),
})

export const ColAgentHealth = columnHelper.accessor(
  ({ node }) => node?.pingedAt,
  {
    id: 'agentHealth',
    header: 'Agent',
    meta: {
      tooltip: 'Whether your agent has pinged within the last 15 minutes',
    },
    enableSorting: true,
    cell: ({ row: { original } }) => (
      <ClusterHealth cluster={original.node || undefined} />
    ),
  }
)

export const ColHealthScore = columnHelper.accessor(
  ({ node }) => node?.healthScore,
  {
    id: 'healthScore',
    header: 'Health',
    meta: {
      tooltip: 'A holistic view of Kubernetes API configuration health',
    },
    cell: ({ table, row: { original } }) => {
      const cluster = original.node
      const { setFlyoverTab, setSelectedCluster } = table.options
        .meta as ClustersTableMeta

      if (!cluster) return null

      return (
        <ClusterHealthScoreChip
          healthScore={cluster?.healthScore}
          onClick={() => {
            setSelectedCluster?.(cluster)
            setFlyoverTab?.(ClusterInfoFlyoverTab.HealthScore)
          }}
        />
      )
    },
  }
)

export const ColUpgradeable = columnHelper.accessor(
  ({ node }) => getNumUpgrades(node),
  {
    id: 'upgradeable',
    header: 'Upgradeable',
    meta: { gridTemplate: 'min-content' },
    cell: ({ table, row: { original } }) => {
      const cluster = original.node
      const { now, setFlyoverTab, setSelectedCluster } = table.options
        .meta as ClustersTableMeta

      if (!cluster) return null

      return (
        <>
          <ClusterUpgradeButton
            cluster={cluster}
            onClick={() => {
              setSelectedCluster?.(cluster)
              setFlyoverTab?.(ClusterInfoFlyoverTab.Upgrades)
            }}
            {...(isClusterHealthy(now, cluster) ? {} : { severity: 'neutral' })}
          />
        </>
      )
    },
  }
)

const getNumUpgrades = (cluster: Nullable<ClustersRowFragment>) => {
  let numUpgrades = 3

  if (!cluster?.upgradePlan?.compatibilities) --numUpgrades
  if (!cluster?.upgradePlan?.deprecations) --numUpgrades
  if (!cluster?.upgradePlan?.incompatibilities) --numUpgrades

  return numUpgrades
}

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

export const ColCdTableActions = columnHelper.accessor(({ node }) => node, {
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
        <AiInsightSummaryIcon
          navPath={`${getClusterDetailsPath({
            clusterId: cluster.id,
          })}/insights`}
          insight={cluster.insight}
        />
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

export const ColHomeTableActions = columnHelper.accessor(({ node }) => node, {
  id: 'actions',
  header: '',
  meta: { gridTemplate: 'max(92px)' },
  cell: function Cell({ getValue }) {
    const cluster = getValue()
    return (
      <Flex gap="xxsmall">
        <AiInsightSummaryIcon
          preserveSpace
          navPath={`${getClusterDetailsPath({
            clusterId: cluster?.id,
          })}/insights`}
          insight={getValue()?.insight}
        />
        <TableCaretLink
          to={getClusterDetailsPath({
            clusterId: cluster?.id,
          })}
          textValue={`View ${cluster?.name} details`}
        />
      </Flex>
    )
  },
})

export const cdClustersColumns = [
  ColCluster,
  ColAgentHealth,
  ColProvider,
  ColVersion,
  ColCpu,
  ColMemory,
  ColClusterSize,
  ColHealthScore,
  ColUpgradeable,
  ColCdTableActions,
]

export const homeClustersColumns = [
  ColCluster,
  ColAgentHealth,
  ColProvider,
  ColVersion,
  ColClusterSize,
  ColHealthScore,
  ColUpgradeable,
  ColHomeTableActions,
]
