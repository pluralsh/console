import { Row, createColumnHelper } from '@tanstack/react-table'
import { UpgradeInsight, UpgradeInsightStatus } from 'generated/graphql'
import { Chip, CollapseIcon } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'
import React, { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import { ChipProps } from '@pluralsh/design-system/dist/components/Chip'

import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { OverlineH1 } from '../../utils/typography/Text'
import { isNonNullable } from '../../../utils/isNonNullable'

const statusToSeverity = {
  [UpgradeInsightStatus.Passing]: 'success',
  [UpgradeInsightStatus.Failed]: 'danger',
  [UpgradeInsightStatus.Unknown]: 'neutral',
} as const satisfies Record<
  UpgradeInsightStatus,
  ComponentProps<typeof Chip>['severity']
>

function UpgradeInsightStatusChip({
  status,
  ...props
}: { status: Nullable<UpgradeInsightStatus> } & ChipProps) {
  const s = status ?? UpgradeInsightStatus.Unknown

  return (
    <Chip
      severity={statusToSeverity[s]}
      {...props}
    >
      {capitalize(s)}
    </Chip>
  )
}

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
    cell: ({ getValue }) => <UpgradeInsightStatusChip status={getValue()} />,
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
  const {
    original: { description, details },
  } = row

  return (
    <div>
      <OverlineH1 css={{ color: theme.colors['text-xlight'] }}>
        Description
      </OverlineH1>
      <p>{description}</p>
      {details && (
        <div css={{ marginTop: theme.spacing.small }}>
          {details
            .filter(isNonNullable)
            .map(
              (
                {
                  used,
                  replacement,
                  replacedIn,
                  removedIn,
                  status = UpgradeInsightStatus.Unknown,
                },
                i
              ) => (
                <div
                  css={{
                    borderBottom:
                      i !== details.length - 1
                        ? theme.borders.default
                        : undefined,
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: theme.spacing.xsmall,
                    paddingTop: theme.spacing.xsmall,
                  }}
                >
                  <div>
                    <div
                      css={{
                        ...theme.partials.text.body2Bold,
                        color: theme.colors.text,
                      }}
                    >
                      {used}
                    </div>
                    <div
                      css={{
                        ...theme.partials.text.caption,
                        color: theme.colors['text-light'],
                      }}
                    >
                      {!!replacement && <>Replaced with: {replacement}</>}
                      {!!removedIn && <>Removed</>}
                    </div>
                  </div>
                  <div>
                    <div css={{ display: 'flex', justifyContent: 'end' }}>
                      <UpgradeInsightStatusChip
                        status={status}
                        size="small"
                        marginBottom={theme.spacing.xxxsmall}
                      />
                    </div>
                    <div
                      css={{
                        ...theme.partials.text.caption,
                        color: theme.colors['text-xlight'],
                        textAlign: 'right',
                      }}
                    >
                      {replacedIn && <>Replacement version: {replacedIn}</>}
                      {removedIn && <>Removal version: {removedIn}</>}
                    </div>
                  </div>
                </div>
              )
            )}
        </div>
      )}
    </div>
  )
}
