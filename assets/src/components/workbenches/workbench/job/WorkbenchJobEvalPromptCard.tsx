import {
  ArrowTopRightIcon,
  Card,
  Chip,
  Code,
  Flex,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { BasicTextButton } from 'components/utils/typography/BasicTextButton'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { truncateKeepingChips } from 'components/utils/contentEditableChips'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { WorkbenchJobActivitiesQuery } from 'generated/graphql'
import { ComponentPropsWithRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'

type ReferencedJob = NonNullable<
  NonNullable<WorkbenchJobActivitiesQuery['workbenchJob']>['referencedJob']
>

const EXPANDABLE_PROMPT_LENGTH = 400

export function WorkbenchJobEvalPromptCard({
  prompt,
  referencedJob,
  ...props
}: {
  prompt: string
  referencedJob: ReferencedJob
} & ComponentPropsWithRef<typeof PromptCardSC>) {
  const theme = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const isExpandable = prompt.length > EXPANDABLE_PROMPT_LENGTH

  const refWorkbenchId = referencedJob.workbench?.id
  const grade = referencedJob.evalResult?.grade ?? null
  const refJobId = referencedJob.id

  return (
    <PromptCardSC {...props}>
      {/* Header: eval grade + link to original job */}
      <Flex
        align="center"
        gap="small"
        justify="space-between"
        css={{ flexWrap: 'wrap', rowGap: theme.spacing.xsmall }}
      >
        <Flex
          align="center"
          gap="small"
        >
          {grade != null && (
            <WorkbenchEvalGradeBadge
              grade={grade}
              size="small"
              colorBorder
            />
          )}
          <Body2BoldP $color="text-light">Update skills from eval</Body2BoldP>
        </Flex>
        {refWorkbenchId && (
          <Chip
            size="small"
            clickable
            forwardedAs={Link}
            to={getWorkbenchJobAbsPath({
              workbenchId: refWorkbenchId,
              jobId: refJobId,
            })}
            css={{ textDecoration: 'none', gap: theme.spacing.xsmall }}
          >
            <RunStatusIcon
              fullColor
              status={referencedJob.status}
              size="small"
            />
            View original job
            <ArrowTopRightIcon
              size={10}
              color="icon-xlight"
            />
          </Chip>
        )}
      </Flex>

      {/* Original job prompt — truncated to 2 lines */}
      {referencedJob.prompt && (
        <SectionSC>
          <CaptionP $color="text-xlight">Original job prompt</CaptionP>
          <OriginalPromptSC>
            <SimplifiedMarkdown text={referencedJob.prompt} />
          </OriginalPromptSC>
        </SectionSC>
      )}

      {/* Skills update prompt — full, expandable */}
      <SectionSC>
        <CaptionP $color="text-xlight">Skills update</CaptionP>
        <SimplifiedMarkdown
          text={
            !isExpandable || isExpanded
              ? prompt
              : truncateKeepingChips(prompt, EXPANDABLE_PROMPT_LENGTH)
          }
        />
        {isExpandable && (
          <BasicTextButton
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            css={{ width: '100%', textAlign: 'right' }}
          >
            {isExpanded ? 'view less' : 'view more'}
          </BasicTextButton>
        )}
      </SectionSC>
    </PromptCardSC>
  )
}

const PromptCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  width: 'fit-content',
  maxWidth: '100%',
  overflow: 'auto',
  wordBreak: 'break-word',
  marginLeft: 'auto',
  marginTop: theme.spacing.small,
  marginBottom: theme.spacing.small,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  [`& ${Code}`]: {
    backgroundColor: theme.colors['fill-two'],
    borderColor: theme.colors['border-fill-two'],
  },
}))

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  borderTop: `1px solid ${theme.colors['border-fill-one']}`,
  paddingTop: theme.spacing.small,
}))

const OriginalPromptSC = styled.div({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})
