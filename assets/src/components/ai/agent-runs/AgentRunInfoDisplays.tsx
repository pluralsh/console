import {
  ArrowTopRightIcon,
  Button,
  CancelledFilledIcon,
  Card,
  CardProps,
  CheckOutlineIcon,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  FlexProps,
  IconFrame,
  PrOpenIcon,
  SpinnerAlt,
  Tooltip,
} from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  AgentRunStatus,
  AgentRunTinyFragment,
  useAgentRunTinyQuery,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { AgentRunPRsModalIcon } from './AIAgentRunsTableCols'

export function AgentRunInfoCard({
  agentRun,
  showLinkButton = false,
  ...props
}: {
  agentRun: Nullable<AgentRunTinyFragment>
  showLinkButton?: boolean
} & CardProps) {
  const { colors } = useTheme()
  const { id = '', status, prompt, insertedAt, updatedAt } = agentRun ?? {}
  const isRunning =
    status === AgentRunStatus.Running || status === AgentRunStatus.Pending
  const { data } = useAgentRunTinyQuery({
    variables: { id },
    skip: !isRunning,
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
  })

  if (!agentRun) return null

  return (
    <AgentRunStatusBoxSC {...props}>
      <Flex gap="small">
        <StackedText
          first={
            <Body2BoldP
              $shimmer={isRunning}
              css={{ whiteSpace: 'nowrap' }}
            >
              {status === AgentRunStatus.Successful
                ? 'Run complete'
                : 'Started agent run'}
            </Body2BoldP>
          }
          icon={
            <IconFrame
              circle
              type="secondary"
              icon={
                <DiscoverIcon
                  size={16}
                  color={colors['icon-default']}
                />
              }
              css={{ flexShrink: 0 }}
            />
          }
        />
        <RunStatusChip
          status={data?.agentRun?.status ?? status}
          fillLevel={2}
          css={{ marginLeft: 'auto' }}
        />
        {showLinkButton && (
          <Button
            small
            as={Link}
            to={getAgentRunAbsPath({ agentRunId: id })}
            endIcon={<ArrowTopRightIcon size={12} />}
          >
            View details
          </Button>
        )}
      </Flex>
      <CaptionP
        $color="text-xlight"
        css={TRUNCATE}
      >
        {prompt}
      </CaptionP>
      <StretchedFlex>
        <CaptionP $color="text-xlight">
          Start time{' '}
          <span css={{ color: colors['text-light'] }}>
            {formatDateTime(insertedAt)}
          </span>
        </CaptionP>
        {!isRunning && (
          <CaptionP $color="text-xlight">
            End time{' '}
            <span css={{ color: colors['text-light'] }}>
              {formatDateTime(updatedAt)}
            </span>
          </CaptionP>
        )}
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
  const { id = '', status, prompt, pullRequests } = agentRun ?? {}
  return (
    <Flex
      alignItems="center"
      gap="xsmall"
      {...props}
    >
      <CaptionP
        $color="text-xlight"
        css={TRUNCATE}
      >
        {prompt}
      </CaptionP>
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
      <AgentRunPRsModalIcon
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
          <AgentRunSmallStatusIcon status={status} />
        </div>
      </Tooltip>
    </Flex>
  )
}

function AgentRunSmallStatusIcon({
  status,
}: {
  status: Nullable<AgentRunStatus>
}) {
  switch (status) {
    case AgentRunStatus.Successful:
      return (
        <CheckOutlineIcon
          color="icon-xlight"
          size={12}
        />
      )
    case AgentRunStatus.Failed:
      return (
        <FailedFilledIcon
          color="icon-danger"
          size={12}
        />
      )
    case AgentRunStatus.Babysitting:
    case AgentRunStatus.Running:
    case AgentRunStatus.Pending:
      return <SpinnerAlt size={12} />
    case AgentRunStatus.Cancelled:
      return (
        <CancelledFilledIcon
          color="icon-xlight"
          size={12}
        />
      )
    default:
      return null
  }
}

const AgentRunStatusBoxSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  padding: theme.spacing.medium,
  width: '100%',
  overflow: 'auto',
}))
