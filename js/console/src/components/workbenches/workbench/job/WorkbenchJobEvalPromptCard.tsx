import {
  ArrowTopRightIcon,
  Card,
  Chip,
  Code,
  Flex,
} from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { ShowMoreSC } from 'components/ai/chatbot/ToolCallContent'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { WorkbenchJobActivitiesQuery } from 'generated/graphql'
import { ComponentPropsWithRef, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'

type ReferencedJob = NonNullable<
  NonNullable<WorkbenchJobActivitiesQuery['workbenchJob']>['referencedJob']
>

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
  const [canExpand, setCanExpand] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = bodyRef.current
    if (!element) return

    const updateCanExpand = () => {
      const nextCanExpand = element.scrollHeight > element.clientHeight + 1
      setCanExpand((prev) => {
        const next = isExpanded ? prev || nextCanExpand : nextCanExpand
        return prev === next ? prev : next
      })
    }

    updateCanExpand()
    const resizeObserver = new ResizeObserver(updateCanExpand)
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [prompt, isExpanded])

  const isExpandable = canExpand || isExpanded
  const showFade = !isExpanded && canExpand

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
            <SimplifiedMarkdown
              text={referencedJob.prompt}
              tone="thought"
            />
          </OriginalPromptSC>
        </SectionSC>
      )}

      {/* Skills update prompt — full, expandable */}
      <SectionSC>
        <CaptionP $color="text-xlight">Skills update</CaptionP>
        <PromptBodySC
          ref={bodyRef}
          $expanded={isExpanded}
          $fade={showFade}
        >
          <SimplifiedMarkdown
            text={prompt}
            tone="thought"
          />
        </PromptBodySC>
        {isExpandable && (
          <ShowMoreSC
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((v) => !v)}
            css={{ paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </ShowMoreSC>
        )}
      </SectionSC>
    </PromptCardSC>
  )
}

const PromptCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  width: '100%',
  maxWidth: '100%',
  overflow: 'auto',
  wordBreak: 'break-word',
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

const PromptBodySC = styled.div<{
  $expanded: boolean
  $fade?: boolean
}>(({ $expanded, $fade }) => ({
  minWidth: 0,
  minHeight: 0,
  maxHeight: $expanded ? 'none' : '4lh',
  overflow: $expanded ? 'visible' : 'hidden',
  lineHeight: 1.45,
  ...($fade && {
    maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
  }),
}))
