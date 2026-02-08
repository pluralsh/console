import {
  Button,
  Card,
  CheckRoundedIcon,
  Chip,
  ChipSeverity,
  CircleDashIcon,
  DiscoverIcon,
  FailedFilledIcon,
  Flex,
  Flyover,
  IconFrame,
  PrClosedIcon,
  PrMergedIcon,
  PrOpenIcon,
  SpinnerAlt,
} from '@pluralsh/design-system'
import { AgentRuntimeIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { StackedText } from 'components/utils/table/StackedText'
import {
  AgentRunFragment,
  AgentRunStatus,
  ClusterUpgradeFragment,
  ClusterUpgradeStatus,
  ClusterUpgradeStepFragment,
  PrStatus,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

export function ClusterUpgradeAgentFlyover({
  clusterUpgrade,
  open,
  onClose,
}: {
  clusterUpgrade: ClusterUpgradeFragment
  open: boolean
  onClose: () => void
}) {
  const { spacing } = useTheme()
  const steps = clusterUpgrade.steps?.filter(isNonNullable) ?? []

  return (
    <Flyover
      header={
        <Flex
          align="center"
          gap="medium"
        >
          <ClusterProviderIcon
            cluster={clusterUpgrade.cluster}
            size={16}
          />
          {clusterUpgrade.cluster?.name ?? 'cluster'} upgrade plan
        </Flex>
      }
      open={open}
      onClose={onClose}
      minWidth={650}
      width="50%"
      css={{ display: 'flex', flexDirection: 'column', gap: spacing.medium }}
    >
      <TopCardSC>
        <StackedText
          first="Runtime"
          firstPartialType="caption"
          firstColor="text-xlight"
          second={
            <Flex
              align="center"
              gap="xsmall"
            >
              <AgentRuntimeIcon
                wrapInFrame={false}
                type={clusterUpgrade.runtime?.type}
              />
              {capitalize(clusterUpgrade.runtime?.name)}
            </Flex>
          }
          secondPartialType="body2"
          secondColor="text"
          css={{ height: '100%', justifyContent: 'space-around' }}
        />
        <StackedText
          first="Status"
          firstPartialType="caption"
          firstColor="text-xlight"
          gap="xxsmall"
          second={
            <Chip
              fillLevel={2}
              severity={statusToChipSeverity[clusterUpgrade.status]}
              loading={
                clusterUpgrade.status == ClusterUpgradeStatus.InProgress ||
                clusterUpgrade.status === ClusterUpgradeStatus.Pending
              }
            >
              {statusToChipLabel[clusterUpgrade.status]}
            </Chip>
          }
          css={{}}
        />
      </TopCardSC>
      {steps.map((step) => (
        <ClusterUpgradeStep
          key={step.id}
          step={step}
        />
      ))}
    </Flyover>
  )
}

function ClusterUpgradeStep({ step }: { step: ClusterUpgradeStepFragment }) {
  const { agentRun } = step
  return (
    <StepCardSC key={step?.id}>
      <StackedText
        truncate
        gap="xxsmall"
        first={step.name}
        firstPartialType="body1Bold"
        firstColor="text"
        second={step.prompt}
        secondPartialType="body2"
        secondColor="text-light"
        css={{ flex: 1 }}
      />
      <AgentRunLinkButton agentRun={agentRun} />
      {agentRun?.pullRequests?.filter(isNonNullable)?.map(({ status, url }) =>
        status === PrStatus.Open ? (
          <Button
            small
            as={Link}
            to={url ?? ''}
            target="_blank"
            startIcon={<PrOpenIcon />}
          >
            Ready for review
          </Button>
        ) : (
          <IconFrame
            as={Link}
            to={url ?? ''}
            type="floating"
            target="_blank"
            icon={
              status === PrStatus.Merged ? <PrMergedIcon /> : <PrClosedIcon />
            }
            tooltip="View pull request"
          />
        )
      )}
      {step.status === ClusterUpgradeStatus.Completed &&
      agentRun?.pullRequests?.every(
        (pullRequest) => pullRequest?.status === PrStatus.Merged
      ) ? (
        <CheckRoundedIcon
          color="icon-success"
          size={20}
        />
      ) : (
        <CircleDashIcon
          color="icon-light"
          size={20}
        />
      )}
    </StepCardSC>
  )
}

const TopCardSC = styled(Card)(({ theme }) => ({
  padding: `${theme.spacing.large}px ${theme.spacing.xxlarge}px`,
  background: 'transparent',
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.xxxlarge,
  border: theme.borders.default,
  '& *': { marginBottom: 0 },
}))

const StepCardSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  paddingLeft: theme.spacing.large,
  borderRadius: theme.borderRadiuses.medium,
  borderLeft: `3px solid ${theme.colors.border}`,
  background: theme.colors['fill-one'],
}))

function AgentRunLinkButton({
  agentRun,
}: {
  agentRun: Nullable<AgentRunFragment>
}) {
  if (!agentRun) return null
  const { status } = agentRun
  switch (status) {
    case AgentRunStatus.Pending:
    case AgentRunStatus.Running:
      return (
        <Button
          small
          floating
          startIcon={<SpinnerAlt />}
          as={Link}
          to={getAgentRunAbsPath({ agentRunId: agentRun.id })}
        >
          View run progress
        </Button>
      )
    case AgentRunStatus.Failed:
    case AgentRunStatus.Cancelled:
      return (
        <Button
          small
          floating
          startIcon={
            <FailedFilledIcon
              color={
                status === AgentRunStatus.Failed ? 'icon-danger' : 'icon-info'
              }
            />
          }
          as={Link}
          to={getAgentRunAbsPath({ agentRunId: agentRun.id })}
        >
          View {status === AgentRunStatus.Failed ? 'failed' : 'cancelled'} run
        </Button>
      )
    case AgentRunStatus.Successful:
      return (
        <IconFrame
          clickable
          as={Link}
          to={getAgentRunAbsPath({ agentRunId: agentRun.id })}
          type="floating"
          icon={<DiscoverIcon />}
          style={{ flexShrink: 0 }}
          tooltip="View agent run details"
        />
      )
  }
}

const statusToChipSeverity: Record<ClusterUpgradeStatus, ChipSeverity> = {
  [ClusterUpgradeStatus.Pending]: 'info',
  [ClusterUpgradeStatus.InProgress]: 'info',
  [ClusterUpgradeStatus.Completed]: 'success',
  [ClusterUpgradeStatus.Failed]: 'danger',
}
const statusToChipLabel: Record<ClusterUpgradeStatus, string> = {
  [ClusterUpgradeStatus.Pending]: 'Pending',
  [ClusterUpgradeStatus.InProgress]: 'Running',
  [ClusterUpgradeStatus.Completed]: 'Runs completed',
  [ClusterUpgradeStatus.Failed]: 'Failed',
}
