import { AppIcon, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro'
import CopyButton from 'components/utils/CopyButton'
import { StackedText } from 'components/utils/table/StackedText'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Body2P } from 'components/utils/typography/Text'
import {
  AddonVersionSummaryFragment,
  CloudAddonFragment,
  CloudAddonUpgradeFragment,
  ClusterOverviewDetailsFragment,
  RuntimeAddon,
  RuntimeAddonUpgradeFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CLUSTER_ADDONS_COMPATIBILITY_PATH,
  getClusterAddOnDetailsPath,
} from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'
import { UpgradesConsolidatedTableExpander } from './UpgradesConsolidatedTableExpander'

export type AddonOverview = {
  id?: Nullable<string>
  name: string
  icon?: ReactNode
  type: 'cloud' | 'helm'
  distro?: string
  currentAppVersion?: Nullable<string>
  fixAppVersion?: Nullable<string>
  currentChartVersion?: Nullable<string>
  fixChartVersion?: Nullable<string>
  releaseUrl?: Nullable<string>
  images?: string[]
  callout?: Nullable<string>
  summary?: Nullable<AddonVersionSummaryFragment>
}

type CloudOrHelmAddon =
  | (RuntimeAddonUpgradeFragment & {
      addon: Pick<RuntimeAddon, 'name' | 'icon'>
    })
  | (CloudAddonUpgradeFragment & { addon: CloudAddonFragment })

type TableMeta = { clusterId: string }

export function UpgradesConsolidatedTable({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const { blockingAddons, blockingCloudAddons } =
    cluster?.upgradePlanSummary ?? {}

  const reactTableOptions: { meta: TableMeta } = useMemo(
    () => ({ meta: { clusterId: cluster.id } }),
    [cluster.id]
  )

  const data: AddonOverview[] = useMemo(
    () =>
      [
        ...(blockingAddons?.filter(isNonNullable) ?? []),
        ...(blockingCloudAddons?.filter(isNonNullable) ?? []),
      ]
        .filter((addon): addon is CloudOrHelmAddon => !!addon.addon)
        .map((addon) => ({
          name: addon.addon.name,
          currentAppVersion: addon.current?.version,
          fixAppVersion: addon.fix?.version,
          type: 'helm',
          ...(addon.__typename === 'CloudAddonUpgrade' && {
            type: 'cloud',
            icon: <DistroProviderIconFrame distro={addon.addon?.distro} />,
            distro: addon.addon?.distro,
            id: addon.addon?.id,
          }),
          ...(addon.__typename === 'RuntimeAddonUpgrade' && {
            id: cluster.runtimeServices?.find(
              (service) => service?.name === addon.addon.name
            )?.id,
            callout: addon.callout,
            currentChartVersion: addon.current?.chartVersion,
            fixChartVersion: addon.fix?.chartVersion,
            icon: (
              <AppIcon
                url={addon.addon?.icon}
                size="xxsmall"
              />
            ),
          }),
          ...(addon.fix?.__typename === 'AddonVersion' && {
            releaseUrl: addon.fix.releaseUrl,
            images: addon.fix.images?.filter(isNonNullable) ?? [],
            summary: addon.fix.summary,
          }),
        })),
    [blockingAddons, blockingCloudAddons, cluster.runtimeServices]
  )

  return (
    <Table
      fullHeightWrap
      data={data}
      columns={cols}
      reactTableOptions={reactTableOptions}
      getRowCanExpand={isRowExpandable}
      getRowIsClickable={isRowExpandable}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
      renderExpanded={({ row }: { row: Row<AddonOverview> }) => (
        <UpgradesConsolidatedTableExpander row={row} />
      )}
      expandedRowType="custom"
    />
  )
}

const columnHelper = createColumnHelper<AddonOverview>()

const cols = [
  ColExpander,
  columnHelper.accessor((row) => row, {
    id: 'addon',
    header: 'Add-on',
    cell: function Cell({ getValue }) {
      const { name, icon } = getValue()
      return (
        <Flex
          gap="small"
          align="center"
        >
          {icon}
          <Body2P>{name}</Body2P>
        </Flex>
      )
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'type',
    header: 'Type',
    cell: function Cell({ getValue }) {
      const { type, distro } = getValue()
      return <Body2P>{type === 'cloud' ? (distro ?? 'Cloud') : 'Helm'}</Body2P>
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'recommendation',
    header: 'Recommendation',
    cell: function Cell({ getValue, table: { options } }) {
      const {
        id,
        type,
        currentAppVersion,
        fixAppVersion,
        currentChartVersion,
        fixChartVersion,
      } = getValue()
      const { clusterId } = (options.meta as Nullable<TableMeta>) ?? {}

      if (!fixAppVersion && !fixChartVersion)
        return (
          <InlineLink
            as={Link}
            to={`${getClusterAddOnDetailsPath({
              clusterId,
              addOnId: id,
              isCloudAddon: type === 'cloud',
            })}/${CLUSTER_ADDONS_COMPATIBILITY_PATH}`}
          >
            No available versions found
          </InlineLink>
        )
      return (
        <Flex
          gap="xsmall"
          align="center"
          width="100%"
        >
          <StackedText
            first={`v ${currentAppVersion ?? '--'}`}
            firstPartialType={!currentChartVersion ? 'body2' : 'caption'}
            firstColor="text-xlight"
            second={currentChartVersion && `c ${currentChartVersion}`}
            secondPartialType="caption"
            secondColor="text-xlight"
            css={{ '& *': { whiteSpace: 'nowrap' } }}
          />
          <Body2P $color="text-xlight">→</Body2P>
          <StackedText
            first={fixAppVersion ?? '--'}
            firstPartialType={!fixChartVersion ? 'body2' : 'caption'}
            firstColor="text"
            second={fixChartVersion}
            secondPartialType="caption"
            secondColor="text"
            css={{ '& *': { fontWeight: 700, whiteSpace: 'nowrap' } }}
          />
        </Flex>
      )
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'compatibilityTable',
    header: 'Compatibility Table',
    cell: function Cell({ getValue, table: { options } }) {
      const { id, type } = getValue()
      const { clusterId } = (options.meta as Nullable<TableMeta>) ?? {}
      return (
        <InlineLink
          as={Link}
          to={`${getClusterAddOnDetailsPath({
            clusterId,
            addOnId: id,
            isCloudAddon: type === 'cloud',
          })}/${CLUSTER_ADDONS_COMPATIBILITY_PATH}`}
        >
          View compatibility table
        </InlineLink>
      )
    },
  }),
  columnHelper.accessor((row) => row, {
    id: 'copy',
    header: (ctx) => (
      <CopyButton
        type="tertiary"
        tooltip="Copy table as markdown"
        text={overviewDataToMarkdown(
          ctx.table.options.data,
          (ctx.table.options.meta as Nullable<TableMeta>)?.clusterId ?? ''
        )}
      />
    ),
    cell: () => null,
  }),
]

const overviewDataToMarkdown = (data: AddonOverview[], clusterId: string) =>
  isEmpty(data)
    ? ''
    : `\
  | Add-on | Type | Recommendation | Release Notes | Compatibility Table | Images |
  | ------ | ---- | -------------- | ------------- | --------------------- | ------ |
  ${data
    .map((addon) => {
      const type = addon.type === 'cloud' ? (addon.distro ?? 'Cloud') : 'Helm'
      const recommendation = addon.fixAppVersion
        ? `${addon.currentAppVersion ?? '--'} → ${addon.fixAppVersion}`
        : 'No available versions found'

      return `| ${addon.name} | ${type} | ${recommendation} | ${addon.releaseUrl ?? '--'} | ${
        addon.id
          ? `${window.location.origin}${getClusterAddOnDetailsPath({
              clusterId,
              addOnId: addon.id,
              isCloudAddon: addon.type === 'cloud',
            })}/${CLUSTER_ADDONS_COMPATIBILITY_PATH}`
          : '--'
      } | ${addon.images?.join('<br>') || '--'} |`
    })
    .join('\n')}`

const isRowExpandable = ({
  original: { images, callout, summary },
}: Row<AddonOverview>) =>
  !isEmpty(images) || !isEmpty(callout) || !isEmpty(summary)
