import { Button, DiscoverIcon, Flex, IconFrame } from '@pluralsh/design-system'
import { RunStatusChip } from 'components/ai/infra-research/details/InfraResearch'
import { AgentRuntimeIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { TRUNCATE } from 'components/utils/truncate'
import {
  AgentRunStatus,
  AwaitingReviewAgentRunFragment,
  useApproveAgentRunMutation,
} from 'generated/graphql'
import { truncate } from 'lodash'
import { Link } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'

export function AwaitingReviewAgentRunItem({
  agentRun,
  onNavigate,
}: {
  agentRun: AwaitingReviewAgentRunFragment
  onNavigate: () => void
}) {
  const theme = useTheme()
  const { prompt, runtime, analysis, pullRequests, workbenchJob } = agentRun
  const [approveAgentRun, { loading: approving }] = useApproveAgentRunMutation({
    variables: { id: agentRun.id },
    refetchQueries: ['PendingApprovalAgentRuns', 'AgentRun'],
  })
  const subtitle =
    pullRequests?.[0]?.title ??
    truncate(prompt ?? '', { length: 56 }) ??
    agentRun.repository
  const viewPath =
    workbenchJob?.id && workbenchJob.workbench?.id
      ? getWorkbenchJobAbsPath({
          workbenchId: workbenchJob.workbench.id,
          jobId: workbenchJob.id,
        })
      : getAgentRunAbsPath({ agentRunId: agentRun.id })

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        padding: theme.spacing.large,
      }}
    >
      <Flex
        align="start"
        gap="small"
      >
        <IconFrame
          circle
          size="large"
          type="secondary"
          icon={
            <DiscoverIcon
              size={16}
              color={theme.colors['icon-default']}
            />
          }
          css={{ flexShrink: 0 }}
        />
        <StackedText
          first="Approval required"
          firstPartialType="body2Bold"
          firstColor="text"
          second={subtitle}
          truncate
          css={{ flex: 1, minWidth: 0 }}
        />
        {runtime && (
          <Flex
            align="center"
            gap="xxsmall"
            padding="xxsmall"
            css={{
              border: theme.borders.default,
              borderRadius: theme.borderRadiuses.medium,
              flexShrink: 0,
            }}
          >
            <AgentRuntimeIcon type={runtime.type} />
            <CaptionP
              $color="text-xlight"
              css={TRUNCATE}
            >
              {runtime.name}
            </CaptionP>
          </Flex>
        )}
      </Flex>

      {analysis?.summary && (
        <Body2P
          $color="text-light"
          css={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {analysis.summary}
        </Body2P>
      )}

      <StretchedFlex
        align="center"
        gap="small"
      >
        <RunStatusChip
          size="small"
          status={AgentRunStatus.PendingApproval}
          showSpinner={false}
        />
        {!agentRun.approvedAt && (
          <Button
            small
            onClick={() => approveAgentRun()}
            loading={approving}
          >
            Approve
          </Button>
        )}
        <Button
          small
          as={Link}
          to={viewPath}
          onClick={onNavigate}
        >
          View job
        </Button>
      </StretchedFlex>
    </div>
  )
}
