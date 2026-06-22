import {
  Button,
  Chip,
  DiscoverIcon,
  Flex,
  IconFrame,
  WarningOutlineIcon,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { AwaitingReviewAgentRunFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { prompt, analysis, pullRequests, workbenchJob } = agentRun
  const workbench = workbenchJob?.workbench
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
        gap: theme.spacing.medium,
        padding: theme.spacing.large,
      }}
    >
      <Flex
        align="center"
        gap="medium"
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
          css={{
            flexShrink: 0,

            border: theme.borders['fill-two'],
            backgroundColor: 'transparent',
          }}
        />
        <StackedText
          first="Approval required"
          firstPartialType="body2Bold"
          firstColor="text"
          second={subtitle}
          truncate
          css={{ flex: 1, minWidth: 0 }}
        />
        {workbenchJob?.id && workbench?.id && workbench.name && (
          <Chip
            size="small"
            severity="neutral"
            fillLevel={1}
            clickable
            onClick={() => {
              navigate(
                getWorkbenchJobAbsPath({
                  workbenchId: workbench.id,
                  jobId: workbenchJob.id,
                })
              )
              onNavigate()
            }}
            icon={<WorkbenchIcon size={12} />}
            truncateWidth={80}
            tooltip="View workbench job"
            css={{ flexShrink: 0 }}
          >
            {workbench.name}
          </Chip>
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

      {/* TODO: Render per-file diff stats (+/- counts) here once awaiting-review can fetch them from the API. */}

      <StretchedFlex
        align="center"
        gap="small"
      >
        <Chip
          size="small"
          iconColor="icon-warning"
          icon={<WarningOutlineIcon />}
        >
          Pending approval
        </Chip>
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
