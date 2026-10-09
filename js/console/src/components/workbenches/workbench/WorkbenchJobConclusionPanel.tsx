import { Flex } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DetailsColumnSC,
  DetailsErrorBanner,
  DetailsLinkSC,
  DetailsPanelBodySC,
  DetailsPanelHeader,
  DetailsTitleSC,
} from 'components/workbenches/common/WorkbenchDetailsView'
import { useWorkbenchJobQuery, WorkbenchJobStatus } from 'generated/graphql'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchJobMeta } from './job/WorkbenchJobMeta'
import { isJobRunning } from './job/WorkbenchJobActivity'
import { WorkbenchJobResultContent } from './job/WorkbenchJobResult'
import {
  useClampOverflow,
  WorkbenchStoredPromptMarkdown,
} from './WorkbenchStoredPromptMarkdown'

const PROMPT_CLAMP_LINES = 4

// Job for a details panel, polled only while it runs (finished jobs don't
// change). The status from the list is used until the job loads.
export function usePolledWorkbenchJob(
  jobId: string,
  listStatus?: Nullable<WorkbenchJobStatus>
) {
  const query = useWorkbenchJobQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
  })
  const { startPolling, stopPolling } = query
  const running = isJobRunning(query.data?.workbenchJob?.status ?? listStatus)

  useEffect(() => {
    if (!running) return
    startPolling(POLL_INTERVAL)
    return () => stopPolling()
  }, [running, startPolling, stopPolling])

  return query
}

// "Conclusion" column of the Details views: the job's prompt and result, with
// an error banner for failed jobs.
export function WorkbenchJobConclusionPanel({
  jobId,
  jobStatus,
  workbenchId,
  headerActions,
}: {
  jobId: string
  jobStatus?: Nullable<WorkbenchJobStatus>
  workbenchId: string
  headerActions?: ReactNode
}) {
  const { data, loading, error } = usePolledWorkbenchJob(jobId, jobStatus)
  const job = data?.workbenchJob
  const viewJobLink = (
    <DetailsLinkSC
      as={Link}
      to={getWorkbenchJobAbsPath({
        workbenchId: job?.workbench?.id ?? workbenchId,
        jobId,
      })}
    >
      View job
    </DetailsLinkSC>
  )

  return (
    <DetailsColumnSC>
      <DetailsPanelHeader title="Conclusion">
        {viewJobLink}
        {headerActions}
      </DetailsPanelHeader>
      <DetailsPanelBodySC>
        {job?.status === WorkbenchJobStatus.Failed && (
          <DetailsErrorBanner action={viewJobLink}>
            Workbench job reported an error.
            {job.error ? ` ${job.error}` : ''}
          </DetailsErrorBanner>
        )}
        {error && <GqlError error={error} />}
        {!job && loading ? (
          <RectangleSkeleton
            $height={320}
            $width="100%"
          />
        ) : (
          job && (
            <>
              <Flex
                direction="column"
                gap="medium"
              >
                <DetailsTitleSC>{job.workbench?.name}</DetailsTitleSC>
                <WorkbenchJobMeta
                  stacked
                  job={job}
                />
                <ExpandablePrompt prompt={job.prompt ?? ''} />
              </Flex>
              <Flex
                direction="column"
                gap="xlarge"
              >
                <WorkbenchJobResultContent job={job} />
              </Flex>
            </>
          )
        )}
      </DetailsPanelBodySC>
    </DetailsColumnSC>
  )
}

const getSelf = (el: HTMLElement) => el

// Prompt (or other text) clamped to a few lines with Read more / Read less.
// `plainText` shows it verbatim, e.g. text from external sources such as alert
// titles, where markdown or prompt chip syntax isn't meant to be rendered.
export function ExpandablePrompt({
  prompt,
  plainText = false,
}: {
  prompt: string
  plainText?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  // both keep the last check while clamped: expanded, nothing is cut off
  const [markdownOverflowing, setMarkdownOverflowing] = useState(false)
  const plainRef = useRef<HTMLDivElement>(null)
  const plainOverflowing = useClampOverflow(
    plainRef,
    getSelf,
    prompt,
    plainText && !expanded
  )
  const overflowing = plainText ? plainOverflowing : markdownOverflowing

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      {plainText ? (
        <PlainPromptSC
          ref={plainRef}
          $lines={expanded ? null : PROMPT_CLAMP_LINES}
        >
          {prompt}
        </PlainPromptSC>
      ) : (
        <WorkbenchStoredPromptMarkdown
          text={prompt}
          density="jobCard"
          clampLines={expanded ? null : PROMPT_CLAMP_LINES}
          promptColor="text-xlight"
          onOverflowChange={expanded ? undefined : setMarkdownOverflowing}
        />
      )}
      {(overflowing || expanded) && (
        <ReadMoreSC
          type="button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Read less' : 'Read more'}
        </ReadMoreSC>
      )}
    </Flex>
  )
}

const PlainPromptSC = styled.div<{ $lines: number | null }>(
  ({ theme, $lines }) => ({
    ...theme.partials.text.body2,
    color: theme.colors['text-xlight'],
    minWidth: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...($lines !== null && {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: $lines,
      overflow: 'hidden',
    }),
  })
)

const ReadMoreSC = styled.button(({ theme }) => ({
  all: 'unset',
  ...theme.partials.text.body2,
  alignSelf: 'flex-start',
  cursor: 'pointer',
  color: theme.colors['text-input-disabled'],
  '&:hover': { color: theme.colors['text-light'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))
