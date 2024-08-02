import { createColumnHelper } from '@tanstack/react-table'
import { RuntimeServicesQuery } from 'generated/graphql'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { TableText } from 'components/cluster/TableElements'
import {
  ArrowTopRightIcon,
  BlockedIcon,
  Chip,
  IconFrame,
} from '@pluralsh/design-system'

import styled, { useTheme } from 'styled-components'

import { Link } from 'react-router-dom'

import { getClusterAddOnDetailsPath } from 'routes/cdRoutesConsts'

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
  (row) => row?.addonVersion?.chartVersion,
  {
    id: 'chartVersion',
    header: 'Chart version',
    cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
  }
)

const VersionSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
}))

function ChartVersion({ runtimeService }: { runtimeService: RuntimeService }) {
  return (
    <VersionSC>
      <TableText>{runtimeService?.version}</TableText>
    </VersionSC>
  )
}
const colVersion = columnHelperRuntime.accessor((row) => row?.version, {
  id: 'version',
  header: 'Version',
  cell({ row: { original } }) {
    return <ChartVersion runtimeService={original} />
  },
})

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
  header: 'Blocks upgrade',
  cell: function Cell({ getValue }) {
    const theme = useTheme()
    const addonVersion = getValue()

    if (!addonVersion?.blocking) return null

    return (
      <Chip severity="danger">
        <BlockedIcon
          color="icon-danger"
          size={theme.spacing.small}
        />
        <span css={{ alignSelf: 'center', marginLeft: theme.spacing.xxsmall }}>
          Blocking
        </span>
      </Chip>
    )
  },
})

export const runtimeColumns = [
  colName,
  colVersion,
  colChartVersion,
  colKubVersion,
  colBlocking,
]
