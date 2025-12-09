import { AppIcon, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper, Row } from '@tanstack/react-table'
import { ColExpander } from 'components/cd/cluster/pod/PodContainers'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro'
import CopyButton from 'components/utils/CopyButton'
import { StackedText } from 'components/utils/table/StackedText'
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
  currentAppVersion?: Nullable<string>
  fixAppVersion?: Nullable<string>
  currentChartVersion?: Nullable<string>
  fixChartVersion?: Nullable<string>
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
          currentAppVersion: addon.current?.version,
          fixAppVersion: addon.fix?.version,
          type: 'helm',
          ...(addon.__typename === 'CloudAddonUpgrade' && {
            type: 'cloud',
            icon: <DistroProviderIconFrame distro={addon.addon?.distro} />,
            distro: addon.addon?.distro,
          }),
          ...(addon.__typename === 'RuntimeAddonUpgrade' && {
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
      getRowIsClickable={(row: Row<AddonOverview>) =>
        !isEmpty(row.original?.images)
      }
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
      const {
        currentAppVersion,
        fixAppVersion,
        currentChartVersion,
        fixChartVersion,
      } = getValue()
      const clusterId = (options.meta as Nullable<TableMeta>)?.clusterId
      if (!fixAppVersion && !fixChartVersion)
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
  columnHelper.accessor((row) => row.releaseUrl, {
    id: 'releaseNotes',
    header: 'Release notes',
    cell: ({ getValue }) => (
      <InlineA
        href={getValue()}
        css={{ wordBreak: 'break-all' }}
      >
        {getValue()?.replace(/(^\w+:|^)\/\/(www\.)?/, '')}
      </InlineA>
    ),
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
      const recommendation = addon.fixAppVersion
        ? `${addon.currentAppVersion ?? '--'} → ${addon.fixAppVersion}`
        : 'No available versions found'

      return `| ${addon.name} | ${type} | ${recommendation} | ${addon.releaseUrl ?? '--'} | ${addon.images?.join('<br>') || '--'} |`
    })
    .join('\n')}`
