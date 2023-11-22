import { createColumnHelper } from '@tanstack/react-table'
import { RuntimeServicesQuery } from 'generated/graphql'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { TableText } from 'components/cluster/TableElements'
import {
  CaretDownIcon,
  CaretRightIcon,
  ErrorIcon,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

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

function AddOnName({ addon, row, expanded }) {
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
        {expanded ? (
          <CaretDownIcon
            size={12}
            onClick={row.getToggleExpandedHandler()}
          />
        ) : (
          <CaretRightIcon
            size={12}
            onClick={row.getToggleExpandedHandler()}
          />
        )}
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

export const runtimeColumns = [
  columnHelperRuntime.accessor((row) => row?.addon, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue, row }) => {
      const addon = getValue()
      const expanded = row.getIsExpanded()

      if (!addon) return null

      return (
        <AddOnName
          addon={addon}
          expanded={expanded}
          row={row}
        />
      )
    },
  }),
  columnHelperRuntime.accessor((row) => row?.version, {
    id: 'version',
    header: 'Version',
    meta: { truncate: true },
    cell: ({ getValue }) => <TableText>{getValue()}</TableText>,
  }),
  columnHelperRuntime.accessor((row) => row?.addonVersion, {
    id: 'kube-version',
    header: 'Kubernetes Versions',
    meta: { truncate: true },
    cell: ({ getValue }) => {
      const addonVersion = getValue()

      if (!addonVersion) return null

      return <TableText>{(addonVersion.kube || []).join(', ')}</TableText>
    },
  }),
  columnHelperRuntime.accessor((row) => row?.addonVersion, {
    id: 'blocking',
    header: 'Blocks Upgrade',
    cell: ({ getValue }) => {
      const addonVersion = getValue()

      if (!addonVersion?.blocking) return null

      return (
        <ErrorIcon
          color="icon-danger"
          size={16}
        />
      )
    },
  }),
  columnHelperRuntime.accessor((row) => row?.service, {
    id: 'git',
    header: 'Repository',
    cell: ({ getValue }) => <GitPointer service={getValue()} />,
  }),
]
