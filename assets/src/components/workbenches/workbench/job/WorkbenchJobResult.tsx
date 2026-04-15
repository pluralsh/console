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
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  PullRequestBasicFragment,
  WorkbenchJobFragment,
} from 'generated/graphql'
import { groupBy, isEmpty } from 'lodash'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityMetrics,
  WorkbenchJobMetricsLegend,
} from './WorkbenchJobActivityResults'
import { WorkbenchJobTodos } from './WorkbenchJobTodos'
import { WorkbenchJobTriggerAlert } from './WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerIssue } from './WorkbenchJobTriggerIssue'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'
import { StackedText } from 'components/utils/table/StackedText'

export function WorkbenchJobResult({
  job,
  loading,
}: {
  job: Nullable<WorkbenchJobFragment>
  loading: boolean
}) {
  const { spacing } = useTheme()
  if (loading)
    return (
      <RectangleSkeleton
        $height={320}
        $width="100%"
        css={{ padding: spacing.large }}
      />
    )

  const conclusion = job?.result?.conclusion
  const workingTheory = job?.result?.workingTheory

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

export function WorkbenchJobMetrics({
  job,
  loading,
}: {
  job: Nullable<WorkbenchJobFragment>
  loading: boolean
}) {
  const metrics = job?.result?.metadata?.metrics?.filter(isNonNullable) ?? []
  const seriesNames = Object.keys(groupBy(metrics, (m) => m.name ?? 'metric'))

  if (loading)
    return (
      <RectangleSkeleton
        $height={320}
        $width="100%"
      />
    )

  if (isEmpty(metrics)) return null

  return (
    <Flex
      direction="column"
      gap="medium"
      width="100%"
    >
      <JobActivityMetrics
        metrics={metrics}
        css={{ minHeight: 300 }}
        lineProps={{ margin: { top: 20, right: 40, bottom: 40, left: 40 } }}
      />
      <WorkbenchJobMetricsLegend
        seriesNames={seriesNames}
        paddingLeft={20}
      />
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
          <PrStatusChip status={pr.status} />
          <IconFrame
            size="small"
            tooltip="View PR"
            icon={<ArrowTopRightIcon color="icon-light" />}
          />
        </WrapperCardSC>
      ))}
    </>
  )
}

const WrapperCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  '&:hover span[id^="link-"]': { textDecoration: 'underline' },
}))
