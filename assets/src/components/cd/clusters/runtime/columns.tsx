import { createColumnHelper } from '@tanstack/react-table'
import { RuntimeServicesQuery } from 'generated/graphql'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { TableText } from 'components/cluster/TableElements'
import {
  ArrowTopRightIcon,
  BlockedIcon,
  CollapseIcon,
  IconFrame,
} from '@pluralsh/design-system'

import styled, { useTheme } from 'styled-components'

import { Link } from 'react-router-dom'

import { GitPointer } from '../deprecationsColumns'

type RuntimeServiceCluster = NonNullable<RuntimeServicesQuery['cluster']>
export type RuntimeService = NonNullable<
  RuntimeServiceCluster['runtimeServices']
>[0]
type AddOnVersion = NonNullable<
  NonNullable<NonNullable<RuntimeService>['addon']>['versions']
>[0]

const columnHelperRuntime = createColumnHelper<RuntimeService>()
const columnHelperExpanded = createColumnHelper<AddOnVersion>()

function AddOnName({ addon, row }) {
  const theme = useTheme()

  return (
    <ColWithIcon icon={addon.icon}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xxsmall,
        }}
      >
        {row.original?.name}
      </div>
    </ColWithIcon>
  )
}

export const expandedColumns = [
  columnHelperExpanded.accessor((row) => row?.version, {
    id: 'version',
    header: 'Add-On Version',
    cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
  }),
  columnHelperExpanded.accessor((row) => row?.kube, {
    id: 'kube',
    header: 'Kubernetes Versions',
    cell: ({ getValue }) => (
      <TableText>{(getValue() || []).join(', ')}</TableText>
    ),
  }),
]

const ExpandButtonSC = styled(CollapseIcon).attrs(() => ({ size: 8 }))((_) => ({
  cursor: 'pointer',
  transform: 'rotate(180deg)',
  transitionDuration: '.2s',
  transitionProperty: 'transform',
  '&.expanded': {
    transform: 'rotate(270deg)',
    transitionDuration: '.2s',
    transitionProperty: 'transform',
  },
}))

const colExpander = columnHelperRuntime.accessor((row) => row?.id, {
  id: 'expander',
  header: () => {},
  cell: ({ row }: any) =>
    row.getCanExpand() && (
      <ExpandButtonSC
        className={row.getIsExpanded() ? 'expanded' : ''}
        onClick={row.getToggleExpandedHandler()}
      />
    ),
})

const colName = columnHelperRuntime.accessor((row) => row?.addon, {
  id: 'name',
  header: 'Name',
  cell: ({ getValue, row }) => {
    const addon = getValue()

    if (!addon) return null

    return (
      <AddOnName
        addon={addon}
        row={row}
      />
    )
  },
})
const colChartVersion = columnHelperRuntime.accessor(
  (row) => row?.addonVersion?.version,
  {
    id: 'chartVersion',
    header: 'Chart version',

    cell: ({ getValue }) => (
      <div css={{ display: 'flex', gap: '' }}>
        <TableText>{getValue()}</TableText>
      </div>
    ),
  }
)

const VersionSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
}))
const VersionArrowLinkSC = styled(IconFrame)(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))

function ChartVersion({
  runtimeService,
  showLinkOut = false,
}: {
  runtimeService: RuntimeService
  showLinkOut?: boolean
}) {
  return (
    <VersionSC>
      <TableText>{runtimeService?.addonVersion?.version}</TableText>
      {showLinkOut && (
        <VersionArrowLinkSC
          clickable
          forwardedAs={Link}
          to="#"
          icon={<ArrowTopRightIcon />}
        />
      )}
    </VersionSC>
  )
}
const colVersion = columnHelperRuntime.accessor(
  (row) => row?.addonVersion?.version,
  {
    id: 'version',
    header: 'Version',
    cell({ row: { original } }) {
      return <ChartVersion runtimeService={original} />
    },
  }
)
const colVersionWithLink = columnHelperRuntime.accessor(
  (row) => row?.addonVersion?.version,
  {
    id: 'version-with-link',
    header: 'Version',
    cell({ row: { original } }) {
      return (
        <ChartVersion
          runtimeService={original}
          showLinkOut
        />
      )
    },
  }
)

const colKubVersion = columnHelperRuntime.accessor((row) => row?.addonVersion, {
  id: 'kube-version',
  header: 'Compatible k8s versions',
  meta: { truncate: true },
  cell: ({ getValue }) => {
    const addonVersion = getValue()

    return <TableText>{(addonVersion?.kube || []).join(', ')}</TableText>
  },
})
const colBlocking = columnHelperRuntime.accessor((row) => row?.addonVersion, {
  id: 'blocking',
  header: 'Blocks k8s upgrade',
  cell: ({ getValue }) => {
    const addonVersion = getValue()

    if (!addonVersion?.blocking) return null

    return (
      <BlockedIcon
        color="icon-danger"
        size={16}
      />
    )
  },
})
const colGit = columnHelperRuntime.accessor((row) => row?.service, {
  id: 'git',
  header: 'Repository',
  cell: ({ getValue }) => <GitPointer service={getValue()} />,
})

export const runtimeColumns = [
  colExpander,
  colName,
  colVersionWithLink,
  colChartVersion,
  colKubVersion,
  colBlocking,
  colGit,
]

export const clusterAddonsColumns = [
  colName,
  colVersion,
  colChartVersion,
  colKubVersion,
  colBlocking,
  colGit,
]
