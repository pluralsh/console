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
import { Body2BoldP } from 'components/utils/typography/Text'
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
      gap="medium"
      height="100%"
      minHeight={0}
      overflow="auto"
    >
      <WorkbenchJobTriggerAlert alert={job?.alert} />
      <WorkbenchJobTriggerIssue issue={job?.issue} />
      <Flex
        direction="column"
        overflow="auto"
      >
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
