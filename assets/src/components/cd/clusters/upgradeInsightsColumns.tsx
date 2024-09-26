import { createColumnHelper } from '@tanstack/react-table'
import { UpgradeInsight } from 'generated/graphql'

const columnHelperDeprecations = createColumnHelper<UpgradeInsight>()

export const upgradeInsightsColumns = [
  columnHelperDeprecations.accessor(({ name }) => name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ status }) => status, {
    id: 'status',
    header: 'Insight status',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ version }) => version, {
    id: 'version',
    header: 'Version',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ refreshedAt }) => refreshedAt, {
    id: 'lastRefresh',
    header: 'Last refresh',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ transitionedAt }) => transitionedAt, {
    id: 'lastTransition',
    header: 'Last transition',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
] // TODO
