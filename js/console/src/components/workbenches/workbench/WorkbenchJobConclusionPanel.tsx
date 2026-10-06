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
} from 'components/workbenches/common/WorkbenchDetailsView'
import { useWorkbenchJobQuery, WorkbenchJobStatus } from 'generated/graphql'
import { ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchJobMeta } from './job/WorkbenchJobMeta'
import { WorkbenchJobResult } from './job/WorkbenchJobResult'
import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'

const PROMPT_CLAMP_LINES = 4
const UNCLAMPED_LINES = 999

// "Conclusion" column of the Details views: the job's prompt and result, with
// an error banner for failed jobs.
export function WorkbenchJobConclusionPanel({
  jobId,
  workbenchId,
  headerActions,
}: {
  jobId: string
  workbenchId: string
  headerActions?: ReactNode
}) {
  const { data, loading, error } = useWorkbenchJobQuery({
    variables: { id: jobId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
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
                <JobTitleSC>{job.workbench?.name}</JobTitleSC>
                <WorkbenchJobMeta
                  stacked
                  job={job}
                />
                <ExpandablePrompt prompt={job.prompt ?? ''} />
              </Flex>
              <WorkbenchJobResult
                job={job}
                loading={false}
                showAlertAndIssue={false}
                scrollable={false}
              />
            </>
          )
        )}
      </DetailsPanelBodySC>
    </DetailsColumnSC>
  )
}

function ExpandablePrompt({ prompt }: { prompt: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    if (expanded) return
    const clamped = ref.current?.querySelector(':scope > div > div')
    setOverflowing(!!clamped && clamped.scrollHeight > clamped.clientHeight + 1)
  }, [expanded, prompt])

  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <div ref={ref}>
        <WorkbenchStoredPromptMarkdown
          text={prompt}
          density="jobCard"
          clampLines={expanded ? UNCLAMPED_LINES : PROMPT_CLAMP_LINES}
          promptColor="text-xlight"
        />
      </div>
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

const JobTitleSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.mono,
  fontSize: 18,
  fontWeight: 400,
  lineHeight: '24px',
  letterSpacing: 0,
  margin: 0,
  paddingTop: theme.spacing.small,
  color: theme.colors.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const ReadMoreSC = styled.button(({ theme }) => ({
  all: 'unset',
  ...theme.partials.text.body2,
  alignSelf: 'flex-start',
  cursor: 'pointer',
  color: theme.colors['text-input-disabled'],
  '&:hover': { color: theme.colors['text-light'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))
