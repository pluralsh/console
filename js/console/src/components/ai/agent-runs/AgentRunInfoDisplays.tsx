import {
  ArrowTopRightIcon,
  Button,
  CancelledFilledIcon,
  Card,
  CardProps,
  CheckOutlineIcon,
  Chip,
  ChipProps,
  FailedFilledIcon,
  Flex,
  FlexProps,
  IconFrame,
  IconProps,
  prettifyRepoUrl,
  PrOpenIcon,
  SpinnerAlt,
  Tooltip,
  WarningIcon,
} from '@pluralsh/design-system'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P } from 'components/utils/typography/Text'
import {
  AgentRunMode,
  AgentRunStatus,
  AgentRunTinyFragment,
  AgentRuntimeType,
  useAgentRunTinyQuery,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { PRsModalIcon } from './AIAgentRunsTableCols'

export function AgentRunIcon({
  runtime,
  size = 16,
  fullColor = true,
  ...props
}: {
  runtime?: Nullable<AgentRunTinyFragment['runtime']>
  size?: number
  fullColor?: boolean
} & Omit<IconProps, 'size'>) {
  const Icon = runtimeToIcon[runtime?.type ?? AgentRuntimeType.Custom]

  return (
    <Icon
      fullColor={fullColor}
      size={size}
      {...props}
    />
  )
}

export function AgentRunInfoCard({
  agentRun,
  showLinkButton = false,
  ...props
}: {
  agentRun: Nullable<AgentRunTinyFragment>
  showLinkButton?: boolean
} & CardProps) {
  const { spacing } = useTheme()
  const {
    id = '',
    status,
    mode,
    prompt,
    repository,
    branch,
    insertedAt,
    updatedAt,
  } = agentRun ?? {}
  const workbenchJob = agentRun?.workbenchJob
  const workbench = workbenchJob?.workbench
  const detailsPath = getAgentRunAbsPath({
    agentRunId: id,
    ...(workbenchJob?.id && workbench?.id
      ? {
          backTo: getWorkbenchJobAbsPath({
            workbenchId: workbench.id,
            jobId: workbenchJob.id,
          }),
          backLabel: workbench.name,
        }
      : {}),
  })
  // Keep polling while the parent prop still looks active; presentation uses
  // the freshest polled status so the card doesn't disagree with itself.
  const shouldPoll =
    status === AgentRunStatus.Running || status === AgentRunStatus.Pending
  const { data } = useAgentRunTinyQuery({
    variables: { id },
    skip: !shouldPoll,
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  })
  const polled = data?.agentRun
  const resolvedStatus = polled?.status ?? status
  const resolvedUpdatedAt = polled?.updatedAt ?? updatedAt
  const isRunning =
    resolvedStatus === AgentRunStatus.Running ||
    resolvedStatus === AgentRunStatus.Pending

  if (!agentRun) return null

  const title =
    resolvedStatus === AgentRunStatus.Successful
      ? 'Run complete'
      : 'Started agent run'

  return (
    <AgentRunStatusBoxSC {...props}>
      <Flex
        gap="small"
        alignItems="center"
      >
        <StackedText
          first={
            <Body2P
              $color="text-light"
              $shimmer={isRunning}
              css={{ whiteSpace: 'nowrap' }}
            >
              {title}
            </Body2P>
          }
          icon={
            <IconFrame
              type="secondary"
              icon={
                <AgentRunIcon
                  runtime={agentRun.runtime}
                  size={16}
                />
              }
              css={{ flexShrink: 0 }}
            />
          }
        />
        <Flex
          alignItems="center"
          gap="small"
          css={{ marginLeft: 'auto', flexShrink: 0 }}
        >
          <Flex
            alignItems="center"
            gap="xsmall"
          >
            <RunStatusIcon
              size="small"
              status={resolvedStatus}
              fullColor
            />
            <Body2P $color="text-xlight">
              {capitalize(resolvedStatus ?? '')}
            </Body2P>
          </Flex>
          <AgentRunModeChip mode={mode} />
        </Flex>
        {showLinkButton && (
          <Button
            small
            tertiary
            padding="none"
            as={Link}
            to={detailsPath}
            endIcon={<ArrowTopRightIcon size={12} />}
          >
            View details
          </Button>
        )}
      </Flex>
      <Body2P
        $color="text-xlight"
        css={TRUNCATE}
      >
        {prompt}
      </Body2P>
      <StretchedFlex
        wrap="wrap"
        gap="small"
        css={{ rowGap: spacing.xsmall }}
      >
        <Flex
          alignItems="center"
          gap="small"
          wrap="wrap"
          css={{ rowGap: spacing.xsmall, minWidth: 0 }}
        >
          <AgentRunMetaItem
            label="Start time"
            value={formatDateTime(insertedAt)}
          />
          {!isRunning && (
            <AgentRunMetaItem
              label="End time"
              value={formatDateTime(resolvedUpdatedAt)}
            />
          )}
        </Flex>
        <Flex
          alignItems="center"
          gap="small"
          wrap="wrap"
          css={{ rowGap: spacing.xsmall, minWidth: 0 }}
        >
          {repository && (
            <AgentRunMetaItem
              label="Repository"
              value={prettifyRepoUrl(repository, true)}
            />
          )}
          {branch && (
            <AgentRunMetaItem
              label="Branch"
              value={branch}
            />
          )}
        </Flex>
      </StretchedFlex>
    </AgentRunStatusBoxSC>
  )
}

export function AgentRunInfoSimple({
  agentRun,
  ...props
}: {
  agentRun: Nullable<AgentRunTinyFragment>
} & FlexProps) {
  const { id = '', status, mode, prompt, pullRequests } = agentRun ?? {}
  return (
    <Flex
      alignItems="center"
      gap="xsmall"
      {...props}
    >
      <AgentRunModeChip
        mode={mode}
        css={{ flexShrink: 0, minWidth: 72, justifyContent: 'center' }}
      />
      <Body2P
        $color="text-xlight"
        css={TRUNCATE}
      >
        {prompt}
      </Body2P>
      <IconFrame
        clickable
        as={Link}
        to={getAgentRunAbsPath({ agentRunId: id })}
        target="_blank"
        rel="noopener noreferrer"
        tooltip="View agent run details"
        icon={
          <ArrowTopRightIcon
            css={{ width: 12 }}
            color="icon-xlight"
          />
        }
        size="small"
        style={{ flexShrink: 0 }}
      />
      <PRsModalIcon
        prs={pullRequests?.filter(isNonNullable) ?? []}
        type="tertiary"
        size="small"
        icon={
          <PrOpenIcon
            css={{ width: 12 }}
            color="icon-xlight"
          />
        }
        style={{ flexShrink: 0 }}
      />
      <Tooltip
        placement="top"
        label={capitalize(status)}
      >
        <div>
          <RunStatusIcon
            size="small"
            status={status}
          />
        </div>
      </Tooltip>
    </Flex>
  )
}

function AgentRunModeChip({
  mode,
  ...props
}: {
  mode: Nullable<AgentRunMode>
} & ChipProps) {
  if (!mode) return null

  return (
    <Chip
      size="small"
      severity="info"
      css={{ flexShrink: 0 }}
      {...props}
    >
      {capitalize(mode)}
    </Chip>
  )
}

function AgentRunMetaItem({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()

  return (
    <Body2P
      $color="text-xlight"
      css={{ ...TRUNCATE, minWidth: 0 }}
    >
      {label} <span css={{ color: colors['text-light'] }}>{value}</span>
    </Body2P>
  )
}

export function RunStatusIcon({
  status,
  size = 'medium',
  fullColor = false,
}: {
  status: Nullable<AgentRunStatus | WorkbenchJobStatus>
  size?: 'small' | 'medium'
  fullColor?: boolean
}) {
  switch (status) {
    case AgentRunStatus.Successful:
      return (
        <CheckOutlineIcon
          color={fullColor ? 'icon-success' : 'icon-xlight'}
          size={size === 'small' ? 12 : 16}
        />
      )
    case AgentRunStatus.Failed:
      return (
        <FailedFilledIcon
          color="icon-danger"
          size={size === 'small' ? 12 : 16}
        />
      )
    case AgentRunStatus.Babysitting:
    case AgentRunStatus.Running:
    case AgentRunStatus.Pending:
      return <SpinnerAlt size={size === 'small' ? 12 : 16} />
    case AgentRunStatus.PendingApproval:
      return (
        <WarningIcon
          color="icon-warning"
          size={size === 'small' ? 12 : 16}
        />
      )
    case AgentRunStatus.Cancelled:
      return (
        <CancelledFilledIcon
          color="icon-xlight"
          size={size === 'small' ? 12 : 16}
        />
      )
    default:
      return null
  }
}

const AgentRunStatusBoxSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  justifyContent: 'space-between',
  padding: theme.spacing.medium,
  width: '100%',
  overflow: 'auto',
}))
