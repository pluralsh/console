import { Row, createColumnHelper } from '@tanstack/react-table'
import { UpgradeInsight, UpgradeInsightStatus } from 'generated/graphql'
import { Chip, CollapseIcon } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'
import React, { ComponentProps } from 'react'

import { useTheme } from 'styled-components'

import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { OverlineH1 } from '../../utils/typography/Text'

const statusToSeverity = {
  [UpgradeInsightStatus.Passing]: 'success',
  [UpgradeInsightStatus.Failed]: 'danger',
  [UpgradeInsightStatus.Unknown]: 'neutral',
} as const satisfies Record<
  UpgradeInsightStatus,
  ComponentProps<typeof Chip>['severity']
>

const columnHelperDeprecations = createColumnHelper<UpgradeInsight>()

export const upgradeInsightsColumns = [
  {
    id: 'expander',
    header: () => {},
    cell: ({ row }: any) =>
      row.getCanExpand() && (
        <CollapseIcon
          size={8}
          cursor="pointer"
          style={
            row.getIsExpanded()
              ? {
                  transform: 'rotate(270deg)',
                  transitionDuration: '.2s',
                  transitionProperty: 'transform',
                }
              : {
                  transform: 'rotate(180deg)',
                  transitionDuration: '.2s',
                  transitionProperty: 'transform',
                }
          }
          onClick={row.getToggleExpandedHandler()}
        />
      ),
  },
  columnHelperDeprecations.accessor(({ name }) => name, {
    id: 'name',
    header: 'Name',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ status }) => status, {
    id: 'status',
    header: 'Insight status',
    cell: ({ getValue }) => {
      const status = getValue() ?? UpgradeInsightStatus.Unknown

      return (
        <Chip severity={statusToSeverity[status]}>{capitalize(status)}</Chip>
      )
    },
  }),
  columnHelperDeprecations.accessor(({ version }) => version, {
    id: 'version',
    header: 'Version',
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ refreshedAt }) => refreshedAt, {
    id: 'lastRefresh',
    header: 'Last refresh',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelperDeprecations.accessor(({ transitionedAt }) => transitionedAt, {
    id: 'lastTransition',
    header: 'Last transition',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
]

export function UpgradeInsightExpansionPanel({
  row,
}: {
  row: Row<UpgradeInsight>
}) {
  const theme = useTheme()

  return (
    // TODO
    <div>
      <OverlineH1 css={{ color: theme.colors['text-xlight'] }}>
        Description
      </OverlineH1>
      <p>{row.original.description}</p>
    </div>
  )
}
