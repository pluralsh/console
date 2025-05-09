import { createColumnHelper } from '@tanstack/react-table'

import { ClusterUpgradeDeprecatedCustomResourceFragment } from '../../../generated/graphql'
import { Chip } from '@pluralsh/design-system'

const columnHelperUpgrade =
  createColumnHelper<ClusterUpgradeDeprecatedCustomResourceFragment>()

export const clusterDeprecatedCustomResourcesColumns = [
  columnHelperUpgrade.accessor((cr) => cr?.name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cr) => cr?.group, {
    id: 'group',
    header: 'Group',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cr) => cr?.kind, {
    id: 'kind',
    header: 'Kind',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cr) => cr?.namespace, {
    id: 'namespace',
    header: 'Namespace',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperUpgrade.accessor((cr) => cr?.version, {
    id: 'version',
    header: 'Version',
    cell: ({ getValue }) => <Chip severity={'warning'}>{getValue()}</Chip>,
  }),
  columnHelperUpgrade.accessor((cr) => cr?.nextVersion, {
    id: 'nextVersion',
    header: 'Next version',
    cell: ({ getValue }) => <Chip severity={'success'}>{getValue()}</Chip>,
  }),
]
