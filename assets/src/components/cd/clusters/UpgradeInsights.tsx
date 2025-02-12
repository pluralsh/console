import { Row, createColumnHelper } from '@tanstack/react-table'
import { UpgradeInsight, UpgradeInsightStatus } from 'generated/graphql'
import { Chip, CollapseIcon, ChipProps } from '@pluralsh/design-system'
import capitalize from 'lodash/capitalize'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import pluralize from 'pluralize'
import { DateTimeCol } from '../../utils/table/DateTimeCol'
import { OverlineH1 } from '../../utils/typography/Text'
import { isNonNullable } from '../../../utils/isNonNullable'
import isEmpty from 'lodash/isEmpty'
import { formatDateTime } from 'utils/datetime'

const statusToSeverity = {
  [UpgradeInsightStatus.Passing]: 'success',
  [UpgradeInsightStatus.Failed]: 'danger',
  [UpgradeInsightStatus.Unknown]: 'neutral',
  [UpgradeInsightStatus.Warning]: 'warning',
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
    meta: { gridTemplate: '32px' },
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
    meta: { gridTemplate: '1fr' },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ status }) => status, {
    id: 'status',
    header: 'Insight status',
    meta: { gridTemplate: 'fit-content(150px)' },
    cell: ({ getValue }) => <UpgradeInsightStatusChip status={getValue()} />,
  }),
  columnHelperDeprecations.accessor(({ version }) => version, {
    id: 'version',
    header: 'Version',
    meta: { gridTemplate: 'fit-content(50px)' },
    cell: ({ getValue }) => <div>{getValue()}</div>,
  }),
  columnHelperDeprecations.accessor(({ refreshedAt }) => refreshedAt, {
    id: 'lastRefresh',
    header: 'Last refresh',
    meta: { gridTemplate: 'fit-content(135px)' },
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelperDeprecations.accessor(({ transitionedAt }) => transitionedAt, {
    id: 'lastTransition',
    header: 'Last transition',
    meta: { gridTemplate: 'fit-content(135px)' },
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
                  clientInfo,
                },
                i
              ) => (
                <div
                  css={{
                    borderTop: i !== 0 ? theme.borders.default : undefined,
                    paddingBottom: theme.spacing.xxsmall,
                    paddingTop: theme.spacing.xsmall,
                  }}
                >
                  <div
                    css={{
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div
                      css={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
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
                        {!!replacement && (
                          <div>Replaced with: {replacement}</div>
                        )}
                      </div>
                    </div>
                    <div
                      css={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
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
                        {replacedIn && (
                          <div>Replacement version: {replacedIn}</div>
                        )}
                        {removedIn && <div>Removal version: {removedIn}</div>}
                      </div>
                    </div>
                  </div>
                  {!isEmpty(clientInfo) && (
                    <div
                      css={{
                        ...theme.partials.text.caption,
                        color: theme.colors['text-light'],
                        paddingBottom: theme.spacing.small,
                      }}
                    >
                      <div>Clients:</div>
                      {clientInfo?.map((client) => (
                        <div>
                          {client?.userAgent} made {client?.count ?? 0}
                          {pluralize(' request', client?.count ?? 0)}, last
                          request at {formatDateTime(client?.lastRequestAt)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
        </div>
      )}
    </div>
  )
}
