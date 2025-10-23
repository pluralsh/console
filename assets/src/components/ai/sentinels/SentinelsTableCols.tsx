import {
  ChecklistIcon,
  CheckRoundedIcon,
  Chip,
  ChipSeverity,
  ErrorIcon,
  Flex,
  GaugeIcon,
  GitHubLogoIcon,
  ListBoxItem,
  LogsIcon,
  PendingOutlineIcon,
  Toast,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Overline } from 'components/cd/utils/PermissionsModal.tsx'
import { Confirm } from 'components/utils/Confirm.tsx'
import { MoreMenu } from 'components/utils/MoreMenu.tsx'
import { CHART_ICON_LIGHT } from 'components/utils/Provider.tsx'
import { DateTimeCol } from 'components/utils/table/DateTimeCol.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { TRUNCATE_LEFT } from 'components/utils/truncate.ts'
import {
  Body1BoldP,
  Body2BoldP,
  Body2P,
  CaptionP,
} from 'components/utils/typography/Text.tsx'
import { groupBy, isEmpty } from 'lodash'
import pluralize from 'pluralize'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime.ts'
import {
  SentinelCheckType,
  SentinelFragment,
  SentinelRunStatus,
  useRunSentinelMutation,
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

export const getSentinelCheckIcon = (type: SentinelCheckType) => {
  switch (type) {
    case SentinelCheckType.Log:
      return <LogsIcon />
    case SentinelCheckType.Kubernetes:
      return (
        <img
          style={{ width: 16, height: 16 }}
          alt="Kubernetes"
          src={CHART_ICON_LIGHT}
        />
      )
    case SentinelCheckType.IntegrationTest:
      return <GaugeIcon />
    default:
      return <LogsIcon />
  }
}
const sentinelCheckTypeToLabel = {
  [SentinelCheckType.Log]: 'Logs',
  [SentinelCheckType.Kubernetes]: 'Kubernetes',
  [SentinelCheckType.IntegrationTest]: 'Integration test',
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
                {getSentinelCheckIcon(type as SentinelCheckType)}
                <Body2P css={{ flex: 1 }}>
                  {sentinelCheckTypeToLabel[type as SentinelCheckType]}
                </Body2P>
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
    const source = `${repository.httpsPath?.replace(/^https?:\/\//, '') || repository.url}@${git.ref}`
    return (
      <SourceWrapperSC>
        <GitHubLogoIcon css={{ width: 20, flexShrink: 0 }} />
        <Tooltip
          placement="top"
          label={source}
        >
          <StackedText
            truncate
            first={source}
            second={git.folder}
          />
        </Tooltip>
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
  header: 'Last run',
  enableSorting: true,
  sortingFn: 'datetime',
  cell: function Cell({ getValue, row: { original } }) {
    if (original.status === SentinelRunStatus.Pending) return '--'
    return <DateTimeCol date={getValue()} />
  },
})

const ColStatus = columnHelper.accessor((sentinel) => sentinel.status, {
  id: 'status',
  header: 'Status',
  enableSorting: true,
  cell: function Cell({ getValue, row: { original } }) {
    const status = getValue()
    if (!status) return null

    return (
      <SentinelStatusChip
        showIcon
        status={status}
        lastRunAt={original.lastRunAt}
      />
    )
  },
})

const ColActions = columnHelper.accessor((sentinel) => sentinel, {
  id: 'actions',
  header: '',
  cell: function Cell({ getValue }) {
    const [menuKey, setMenuKey] = useState<Nullable<'run'>>()

    return (
      <>
        <MoreMenu onSelectionChange={(newKey) => setMenuKey(newKey)}>
          <ListBoxItem
            key="run"
            label="Run sentinel"
            textValue="Run sentinel"
          />
        </MoreMenu>
        <SentinelRunDialog
          sentinel={getValue()}
          open={menuKey === 'run'}
          onClose={() => setMenuKey(null)}
        />
      </>
    )
  },
})

export function SentinelRunDialog({
  sentinel,
  open,
  onClose,
}: {
  sentinel: Nullable<SentinelFragment>
  open: boolean
  onClose: () => void
}) {
  const [showToast, setShowToast] = useState(false)
  const [mutation, { loading, error }] = useRunSentinelMutation({
    onCompleted: () => {
      onClose()
      setShowToast(true)
    },
    awaitRefetchQueries: true,
    refetchQueries: ['Sentinel', 'Sentinels', 'SentinelRuns'],
  })

  if (!sentinel) return null
  return (
    <>
      <Confirm
        open={open}
        close={onClose}
        error={error}
        loading={loading}
        submit={() => mutation({ variables: { id: sentinel.id } })}
        title="Confirm sentinel run"
        label="Run sentinel"
        text={
          <span>
            {'This will run the configured AI checks for '}
            <Body1BoldP
              as="span"
              $color="icon-info"
            >
              {sentinel.name}
            </Body1BoldP>
            {
              ". It's read-only and won't change your infrastructure. Results, plus AI reasoning per check, will appear in Run Details."
            }
          </span>
        }
      />
      <Toast
        show={showToast}
        severity="success"
        margin="medium"
        closeTimeout={5000}
        onClose={() => setShowToast(false)}
      >
        {sentinel.name} sentinel run started
      </Toast>
    </>
  )
}

export function SentinelStatusChip({
  status,
  lastRunAt,
  numErrors,
  showIcon = false,
  showSeverity = false,
  filled = false,
  small = false,
}: {
  status: SentinelRunStatus
  lastRunAt?: Nullable<string>
  numErrors?: number
  showIcon?: boolean
  showSeverity?: boolean
  filled?: boolean
  small?: boolean
}) {
  const { borders } = useTheme()
  const isPending = status === SentinelRunStatus.Pending
  const TextComponent = small ? CaptionP : Body2BoldP
  return (
    <WrapWithIf
      condition={isPending && !!lastRunAt}
      wrapper={
        <Tooltip
          placement="top"
          label={
            <Flex direction="column">
              <CaptionP $color="text-light">Run started:</CaptionP>
              <CaptionP $color="text-light">{fromNow(lastRunAt)}</CaptionP>
            </Flex>
          }
        />
      }
    >
      <Chip
        severity={statusToSeverity[status]}
        css={{
          whiteSpace: 'nowrap',
          border: isPending ? 'none' : borders.default,
          ...((!filled || isPending) && { background: 'none' }),
          ...(numErrors && { height: 32 }),
        }}
        size={small ? 'small' : 'medium'}
      >
        <Flex
          gap="xsmall"
          align="center"
        >
          {(showIcon || isPending) && statusToIcon[status]}
          {isPending ? (
            <CaptionP $color="icon-info">In progress</CaptionP>
          ) : (
            <TextComponent $color={showSeverity ? undefined : 'text-light'}>
              {statusToText[status]}
            </TextComponent>
          )}
          {!!numErrors && (
            <Chip
              size="small"
              severity="danger"
            >
              {numErrors} {pluralize('error', numErrors)}
            </Chip>
          )}
        </Flex>
      </Chip>
    </WrapWithIf>
  )
}

export const sentinelsCols = [
  ColName,
  ColChecks,
  ColSource,
  ColLastRun,
  ColStatus,
  ColActions,
]

const statusToIcon = {
  [SentinelRunStatus.Success]: <CheckRoundedIcon size={12} />,
  [SentinelRunStatus.Failed]: <ErrorIcon size={12} />,
  [SentinelRunStatus.Pending]: (
    <PendingOutlineIcon
      color="icon-light"
      size={12}
    />
  ),
}
const statusToSeverity: Record<SentinelRunStatus, ChipSeverity> = {
  [SentinelRunStatus.Success]: 'success',
  [SentinelRunStatus.Failed]: 'danger',
  [SentinelRunStatus.Pending]: 'info',
}
const statusToText = {
  [SentinelRunStatus.Success]: 'Passed',
  [SentinelRunStatus.Failed]: 'Failed',
}
