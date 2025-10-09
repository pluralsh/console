import {
  ChecklistIcon,
  CheckRoundedIcon,
  Chip,
  ErrorIcon,
  Flex,
  GitHubLogoIcon,
  ListBoxItem,
  LogsIcon,
  StatusIpIcon,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Overline } from 'components/cd/utils/PermissionsModal.tsx'
import { MoreMenu } from 'components/utils/MoreMenu.tsx'
import { CHART_ICON_LIGHT } from 'components/utils/Provider.tsx'
import { DateTimeCol } from 'components/utils/table/DateTimeCol.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { Body2P, CaptionP } from 'components/utils/typography/Text.tsx'
import { capitalize, groupBy, isEmpty } from 'lodash'
import pluralize from 'pluralize'
import { fromNow } from 'utils/datetime.ts'
import {
  SentinelCheckType,
  SentinelFragment,
  SentinelRunStatus,
} from '../../../generated/graphql.ts'

const columnHelper = createColumnHelper<SentinelFragment>()

const ColName = columnHelper.accessor((sentinel) => sentinel, {
  id: 'name',
  header: 'Name',
  cell: function Cell({ getValue }) {
    const { name, description } = getValue()
    return (
      <StackedText
        first={name}
        second={description}
      />
    )
  },
})

const checkTypeToIcon = {
  [SentinelCheckType.Log]: <LogsIcon />,
  [SentinelCheckType.Kubernetes]: (
    <img
      style={{ width: 16, height: 16 }}
      alt="Kubernetes"
      src={CHART_ICON_LIGHT}
    />
  ),
}

const ColChecks = columnHelper.accessor((sentinel) => sentinel.checks, {
  id: 'checks',
  header: 'Checks',
  cell: function Cell({ getValue }) {
    const checks = getValue()
    if (!checks || isEmpty(checks)) return null

    return (
      <Tooltip
        placement="top"
        label={
          <Flex
            direction="column"
            padding="small"
            gap="xsmall"
            width={230}
          >
            <Overline>check summary</Overline>
            {Object.entries(groupBy(checks, 'type')).map(([type, checks]) => (
              <Flex
                key={type}
                gap="small"
                align="center"
              >
                {checkTypeToIcon[type] ?? <LogsIcon />}
                <Body2P css={{ flex: 1 }}>{pluralize(capitalize(type))}</Body2P>
                <Chip
                  fillLevel={3}
                  size="small"
                >
                  {checks.length}
                </Chip>
              </Flex>
            ))}
          </Flex>
        }
      >
        <Chip clickable>
          <Flex
            gap="xsmall"
            align="center"
          >
            <ChecklistIcon size={12} />
            <span>{checks.length}</span>
          </Flex>
        </Chip>
      </Tooltip>
    )
  },
})

const ColSource = columnHelper.accessor((sentinel) => sentinel, {
  id: 'source',
  header: 'Source',

  cell: function Cell({ getValue }) {
    const { git, repository } = getValue()
    if (!git || !repository) return null
    return (
      <Flex gap="small">
        <GitHubLogoIcon />
        <StackedText
          first={repository.url}
          second={git.folder}
        />
      </Flex>
    )
  },
})

const ColLastRun = columnHelper.accessor((sentinel) => sentinel.lastRunAt, {
  id: 'lastRun',
  header: 'Last Run',
  enableSorting: true,
  sortingFn: 'datetime',
  cell: function Cell({ getValue, row: { original } }) {
    if (original.status === SentinelRunStatus.Pending) return '--'
    return <DateTimeCol date={getValue()} />
  },
})

const statusToIcon = {
  [SentinelRunStatus.Success]: (
    <CheckRoundedIcon
      color="icon-success"
      size={12}
    />
  ),
  [SentinelRunStatus.Failed]: (
    <ErrorIcon
      color="icon-danger"
      size={12}
    />
  ),
  [SentinelRunStatus.Pending]: <StatusIpIcon size={12} />,
}
const statusToText = {
  [SentinelRunStatus.Success]: 'Passed',
  [SentinelRunStatus.Failed]: 'Failed',
}

const ColStatus = columnHelper.accessor((sentinel) => sentinel.status, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
  cell: function Cell({ getValue, row: { original } }) {
    const status = getValue()
    const isPending = status === SentinelRunStatus.Pending
    if (!status) return null

    return (
      <WrapWithIf
        condition={isPending}
        wrapper={
          <Tooltip
            placement="top"
            label={
              <Flex direction="column">
                <CaptionP $color="text-light">Run started:</CaptionP>
                <CaptionP $color="text-light">
                  {fromNow(original.lastRunAt)}
                </CaptionP>
              </Flex>
            }
          />
        }
      >
        <Chip
          inactive
          css={{ ...(isPending && { border: 'none', background: 'none' }) }}
        >
          <Flex
            gap="xsmall"
            align="center"
          >
            {statusToIcon[status]}
            {isPending ? (
              <CaptionP $color="icon-info">In progress</CaptionP>
            ) : (
              <span>{statusToText[status]}</span>
            )}
          </Flex>
        </Chip>
      </WrapWithIf>
    )
  },
})

const ColActions = columnHelper.accessor((sentinel) => sentinel, {
  id: 'actions',
  header: '',
  cell: function Cell({ getValue }) {
    const { id } = getValue()
    // TODO
    return (
      <MoreMenu>
        <ListBoxItem label={id} />
      </MoreMenu>
    )
  },
})

export const sentinelsCols = [
  ColName,
  ColChecks,
  ColSource,
  ColLastRun,
  ColStatus,
  ColActions,
]
