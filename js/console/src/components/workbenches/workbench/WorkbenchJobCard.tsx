import { Card, CaretRightIcon } from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { WorkbenchUsageChips } from 'components/workbenches/common/WorkbenchUsageChips'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import { WorkbenchJobTinyFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { WorkbenchJobActionsRow } from './WorkbenchJobsTable'

export function WorkbenchJobCard({ job }: { job: WorkbenchJobTinyFragment }) {
  const { id, prompt, status, insertedAt, user, workbench } = job
  if (!workbench) return null

  return (
    <JobCardSC
      clickable
      forwardedAs={Link}
      to={getWorkbenchJobAbsPath({ workbenchId: workbench.id, jobId: id })}
    >
      <StretchedFlex>
        {user ? (
          <CaptionP
            $color="text-xlight"
            css={TRUNCATE}
          >
            {user.name}
          </CaptionP>
        ) : (
          <span />
        )}
        <StretchedFlex
          gap="small"
          css={{ width: 'auto' }}
        >
          <CaptionP $color="text-xlight">{fromNow(insertedAt)}</CaptionP>
          <RunStatusIcon
            fullColor
            status={status}
          />
        </StretchedFlex>
      </StretchedFlex>
      <WorkbenchStoredPromptMarkdown
        text={prompt ?? ''}
        density="jobCard"
        clampLines={2}
      />
      <UsageRowSC>
        <WorkbenchUsageChips
          usage={job.usage}
          budget={job.modes?.budget}
          error={job.error}
        />
      </UsageRowSC>
      <BottomSectionSC>
        <DividerSC />
        <CardActionsRowSC>
          <WorkbenchJobActionsRow
            job={job}
            chipFillLevel={2}
          />
          <CaretRightIcon
            color="icon-xlight"
            css={{ marginLeft: 'auto', flexShrink: 0 }}
          />
        </CardActionsRowSC>
      </BottomSectionSC>
    </JobCardSC>
  )
}

export const WorkbenchJobCardGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: theme.spacing.medium,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))

const JobCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  minHeight: 140,
  '&&:has(button:hover, [data-clickable="true"]:hover):hover': {
    backgroundColor: theme.colors['fill-one'],
  },
}))

const UsageRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxsmall,
  flexWrap: 'wrap',
  minHeight: 24,
}))

const BottomSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  marginTop: 'auto',
}))

// Fixed height matches the tallest possible child (IconFrame medium = 32px)
// so all action rows occupy the same layout height without clipping content.
const CardActionsRowSC = styled.div({
  height: 32,
  display: 'flex',
  alignItems: 'center',
})

const DividerSC = styled.div(({ theme }) => ({
  borderTop: `1px solid ${theme.colors['border-fill-one']}`,
  marginLeft: -theme.spacing.medium,
  marginRight: -theme.spacing.medium,
}))
