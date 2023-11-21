import { createColumnHelper } from '@tanstack/react-table'
import { RuntimeServicesQuery } from 'generated/graphql'

import { ColWithIcon } from 'components/utils/table/ColWithIcon'
import { TableText } from 'components/cluster/TableElements'
import { ErrorIcon } from '@pluralsh/design-system'

type RuntimeServiceCluster = NonNullable<RuntimeServicesQuery['cluster']>
type RuntimeService = NonNullable<RuntimeServiceCluster['runtimeServices']>[0]
const columnHelperRuntime = createColumnHelper<RuntimeService>()

export const runtimeColumns = [
  columnHelperRuntime.accessor((row) => row?.addon, {
    id: 'name',
    header: 'Name',
    meta: { truncate: true },
    cell: ({ getValue, row: { original } }) => {
      const addon = getValue()
      if (!addon) return null

      return <ColWithIcon icon={addon.icon}>{original?.name}</ColWithIcon>
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
    header: 'Supported Kubernetes Versions',
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
    meta: { truncate: true },
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
]
