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
  Toast,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Overline } from 'components/cd/utils/PermissionsModal.tsx'
import { MoreMenu } from 'components/utils/MoreMenu.tsx'
import { CHART_ICON_LIGHT } from 'components/utils/Provider.tsx'
import { DateTimeCol } from 'components/utils/table/DateTimeCol.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { TRUNCATE_LEFT } from 'components/utils/truncate.ts'
import { Body2P, CaptionP } from 'components/utils/typography/Text.tsx'
import { capitalize, groupBy, isEmpty } from 'lodash'
import pluralize from 'pluralize'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime.ts'
import {
  SentinelCheckType,
  SentinelFragment,
  SentinelRunStatus,
  useRunSentinelMutation,
} from '../../../generated/graphql.ts'
import { useState } from 'react'
import { Confirm } from 'components/utils/Confirm.tsx'

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
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const { git, repository } = getValue()
    if (!git || !repository) return null
    return (
      <SourceWrapperSC>
        <GitHubLogoIcon css={{ width: 20, flexShrink: 0 }} />
        <StackedText
          truncate
          first={`${repository.httpsPath?.replace(/^https?:\/\//, '') || repository.url}@${git.ref}`}
          second={git.folder}
        />
      </SourceWrapperSC>
    )
  },
})
const SourceWrapperSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  maxWidth: 250,
  gap: theme.spacing.small,
  ...TRUNCATE_LEFT,
  flexDirection: 'row-reverse',
}))

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
          css={{
            ...(isPending && { border: 'none', background: 'none' }),
            whiteSpace: 'nowrap',
          }}
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
    const { id, name } = getValue()
    const [menuKey, setMenuKey] = useState<Nullable<'run'>>()
    const [showToast, setShowToast] = useState(false)
    const [mutation, { loading, error }] = useRunSentinelMutation({
      variables: { id },
      onCompleted: () => {
        setMenuKey(null)
        setShowToast(true)
      },
    })
    return (
      <>
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key="run"
            label="Run sentinel"
            textValue="Run sentinel"
          />
        </MoreMenu>
        <Confirm
          open={menuKey === 'run'}
          close={() => setMenuKey(null)}
          error={error}
          loading={loading}
          submit={() => mutation()}
          title="Confirm sentinel run"
          text={`This will run the configured AI checks for ${name}. It's read-only and won't change your infrastructure. Results, plus AI reasoning per check, will appear in Run Details.`}
        />
        <Toast
          show={showToast}
          severity="success"
          margin="medium"
          closeTimeout={5000}
          onClose={() => setShowToast(false)}
        >
          {name} sentinel run started
        </Toast>
      </>
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
