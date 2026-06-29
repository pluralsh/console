import {
  ArrowTopRightIcon,
  Card,
  Code,
  Flex,
  IconFrame,
  Markdown,
  prettifyRepoUrl,
  PrOpenIcon,
} from '@pluralsh/design-system'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  Body2BoldP,
  Subtitle1H1,
  Subtitle2H1,
} from 'components/utils/typography/Text'
import { WorkbenchEvalGradeBadge } from 'components/workbenches/common/WorkbenchEvalGradeBadge'
import { WorkbenchEvalSkillButton } from 'components/workbenches/common/WorkbenchEvalSkillButton'
import {
  PullRequestBasicFragment,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isJobRunning } from './WorkbenchJobActivity'
import { WorkbenchJobTodos } from './WorkbenchJobTodos'
import { WorkbenchJobTriggerAlert } from './WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerChatbot } from './WorkbenchJobTriggerChatbot'
import { WorkbenchJobTriggerIssue } from './WorkbenchJobTriggerIssue'

export function WorkbenchJobResult({
  job,
  loading,
}: {
  job: Nullable<WorkbenchJobFragment>
  loading: boolean
}) {
  const { spacing } = useTheme()
  const conclusion = isJobRunning(job?.status) ? null : job?.result?.conclusion
  const workingTheory = job?.result?.workingTheory

  if (loading)
    return (
      <RectangleSkeleton
        $height={320}
        $width="100%"
        css={{ padding: spacing.large }}
      />
    )

  return (
    <Flex
      direction="column"
      gap="xlarge"
      height="100%"
      minHeight={0}
      overflow="auto"
    >
      <WorkbenchJobTriggerAlert alert={job?.alert} />
      <WorkbenchJobTriggerIssue issue={job?.issue} />
      <WorkbenchJobTriggerChatbot job={job} />
      <Flex
        direction="column"
        overflow="auto"
      >
        <Subtitle1H1 $color="text">
          {conclusion
            ? 'Conclusion'
            : workingTheory
              ? 'Working theory'
              : undefined}
        </Subtitle1H1>
        <Markdown text={conclusion || workingTheory || 'No output yet.'} />
      </Flex>
      {!isEmpty(job?.result?.todos) && !conclusion && (
        <WorkbenchJobTodos
          loading={loading}
          result={job?.result}
        />
      )}
    </Flex>
  )
}

export function WorkbenchJobTopology({ topology }: { topology: string }) {
  const [mermaidError, setMermaidError] = useState<Nullable<Error>>(null)
  return (
    <>
      {mermaidError && <GqlError error={mermaidError} />}
      <Code
        language="mermaid"
        showHeader={false}
        setMermaidError={setMermaidError}
      >
        {topology ?? ''}
      </Code>
    </>
  )
}

export function WorkbenchJobPrs({ prs }: { prs: PullRequestBasicFragment[] }) {
  return (
    <>
      <StackedText
        icon={
          <IconFrame
            circle
            type="secondary"
            icon={<PrOpenIcon />}
          />
        }
        first={<Body2BoldP>Generated pull requests</Body2BoldP>}
      />
      {prs.map((pr) => (
        <WrapperCardSC
          key={pr.id}
          fillLevel={0}
          clickable
          forwardedAs="a"
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <StackedText
            truncate
            first={
              <span id={`link-${pr.id}`}>{prettifyRepoUrl(pr.url, true)}</span>
            }
            firstPartialType="body2"
            firstColor="text"
            second={pr.title}
          />
          <RightActionsSC>
            <PrStatusChip status={pr.status} />
            <IconFrame
              size="small"
              tooltip="View PR"
              icon={<ArrowTopRightIcon color="icon-light" />}
            />
          </RightActionsSC>
        </WrapperCardSC>
      ))}
    </>
  )
}

export function WorkbenchJobEval({ job }: { job: WorkbenchJobFragment }) {
  const evalResult = job.evalResult
  const feedback = evalResult?.feedback
  const grade = evalResult?.grade ?? 0
  const workbenchId = job.workbench?.id ?? ''

  if (!evalResult) return null

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Flex
        align="center"
        gap="medium"
        justify="space-between"
      >
        <Flex
          align="center"
          gap="medium"
        >
          <WorkbenchEvalGradeBadge
            grade={grade}
            colorBorder
            size="medium"
          />
          <Subtitle2H1 css={{ fontWeight: 400 }}>
            Overall grade: {grade.toFixed(0)}/10
          </Subtitle2H1>
        </Flex>
        <WorkbenchEvalSkillButton
          evalResultId={evalResult.id}
          workbenchId={workbenchId}
          floating
          small
        />
      </Flex>
      <EvalSection title="Summary">{feedback?.summary}</EvalSection>
      <EvalSection title="Prompt">{feedback?.prompt}</EvalSection>
      <EvalSection title="Conclusion">{feedback?.result}</EvalSection>
      <EvalSection title="Logic and thoughts">{feedback?.logic}</EvalSection>
    </Flex>
  )
}

function EvalSection({
  title,
  children,
}: {
  title: string
  children?: Nullable<string>
}) {
  if (!children) return null

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Subtitle2H1
        $color="text-light"
        css={{ fontWeight: 400 }}
      >
        {title}
      </Subtitle2H1>
      <Markdown text={children} />
    </Flex>
  )
}

const WrapperCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  '&:hover span[id^="link-"]': { textDecoration: 'underline' },
}))

const RightActionsSC = styled.div(({ theme }) => ({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flexShrink: 0,
}))
