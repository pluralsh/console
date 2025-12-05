import { AppIcon, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { BoldTextSC } from 'components/cost-management/details/recommendations/ClusterScalingRecsTableCols'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro'
import CopyButton from 'components/utils/CopyButton'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { Body2P, CaptionP, InlineA } from 'components/utils/typography/Text'
import {
  CloudAddon,
  CloudAddonUpgrade,
  ClusterOverviewDetailsFragment,
  RuntimeAddon,
  RuntimeAddonUpgrade,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ReactNode, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CLUSTER_ADDONS_REL_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'

type AddonOverview = {
  name: string
  icon?: ReactNode
  type: 'cloud' | 'helm'
  distro?: string
  currentVersion?: Nullable<string>
  fixVersion?: Nullable<string>
  releaseUrl?: Nullable<string>
  images?: string[]
}

type CloudOrHelmAddon =
  | (RuntimeAddonUpgrade & { addon: RuntimeAddon })
  | (CloudAddonUpgrade & { addon: CloudAddon })

type TableMeta = {
  clusterId: string
}
export function UpgradesConsolidatedTable({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  const { blockingAddons, blockingCloudAddons } =
    cluster?.upgradePlanSummary ?? {}
  const reactTableOptions = useMemo(
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
          currentVersion: addon.current?.version,
          fixVersion: addon.fix?.version,
          type: 'helm',
          ...(addon.addon.__typename === 'CloudAddon' && {
            type: 'cloud',
            icon: <DistroProviderIconFrame distro={addon.addon?.distro} />,
            distro: addon.addon?.distro,
          }),
          ...(addon.addon.__typename === 'RuntimeAddon' && {
            icon: (
              <AppIcon
                url={addon.addon?.icon}
                size="xxsmall"
              />
            ),
          }),
          ...(addon.fix?.__typename === 'AddonVersion' && {
            releaseUrl: addon.fix?.releaseUrl,
            images: addon.fix?.images?.filter(isNonNullable) ?? [],
          }),
        })),
    [blockingAddons, blockingCloudAddons]
  )
  return (
    <Table
      fullHeightWrap
      data={data}
      columns={cols}
      reactTableOptions={reactTableOptions}
      getRowCanExpand={(row: Row<AddonOverview>) =>
        !isEmpty(row.original.images)
      }
      getRowIsClickable={(row) => !isEmpty(row.original.images)}
      renderExpanded={({ row }: { row: Row<AddonOverview> }) => (
        <div>
          <CaptionP
            $color="text-xlight"
            css={{ userSelect: 'none' }}
          >
            Images needed to procure:
          </CaptionP>
          {row.original.images?.map((image) => (
            <CaptionP key={image}>{image}</CaptionP>
          ))}
        </div>
      )}
      onRowClick={(_, row) => row.getToggleExpandedHandler()()}
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
      const { currentVersion, fixVersion } = getValue()
      const clusterId = (options.meta as Nullable<TableMeta>)?.clusterId
      if (!fixVersion)
        return (
          <InlineLink
            as={Link}
            to={`${getClusterDetailsPath({
              clusterId,
            })}/${CLUSTER_ADDONS_REL_PATH}`}
          >
            No available versions found
          </InlineLink>
        )
      return (
        <Body2P>
          {`${currentVersion ?? '--'}  →  `}
          <BoldTextSC>{`${fixVersion}`}</BoldTextSC>
        </Body2P>
      )
    },
  }),
  columnHelper.accessor((row) => row.releaseUrl, {
    id: 'releaseNotes',
    header: 'Release notes',
    cell: ({ getValue }) => <InlineA href={getValue()}>{getValue()}</InlineA>,
  }),
  columnHelper.accessor((row) => row, {
    id: 'copy',
    header: (ctx) => (
      <CopyButton
        type="tertiary"
        tooltip="Copy table as markdown"
        text={overviewDataToMarkdown(ctx.table.options.data)}
      />
    ),
    cell: () => null,
  }),
]

const overviewDataToMarkdown = (data: AddonOverview[]) =>
  isEmpty(data)
    ? ''
    : `\
  | Add-on | Type | Recommendation | Release Notes | Images |
  | ------ | ---- | -------------- | ------------- | ------ |
  ${data
    .map((addon) => {
      const type = addon.type === 'cloud' ? (addon.distro ?? 'Cloud') : 'Helm'
      const recommendation = addon.fixVersion
        ? `${addon.currentVersion ?? '--'} → ${addon.fixVersion}`
        : 'No available versions found'

      return `| ${addon.name} | ${type} | ${recommendation} | ${addon.releaseUrl ?? '--'} | ${addon.images?.join(', ') || '--'} |`
    })
    .join('\n')}`
