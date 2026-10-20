import { Card, CaretRightIcon } from '@pluralsh/design-system'
import { RunStatusIcon } from 'components/ai/agent-runs/AgentRunInfoDisplays'
import { prettifyPrompt } from 'components/utils/contentEditableChips'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import {
  CardRaisedSC,
  CardTargetLinkSC,
  clickableCardStyles,
} from 'components/workbenches/common/WorkbenchBoard'
import { WorkbenchUsageChips } from 'components/workbenches/common/WorkbenchUsageChips'
import { WorkbenchStoredPromptMarkdown } from 'components/workbenches/workbench/WorkbenchStoredPromptMarkdown'
import { WorkbenchJobTinyFragment } from 'generated/graphql'
import { truncate } from 'lodash'
import { memo } from 'react'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { WorkbenchJobActionsRow } from './WorkbenchJobsTable'

// memoized: Apollo keeps unchanged jobs' objects across polls, so only the
// changed cards re-render
export const WorkbenchJobCard = memo(function WorkbenchJobCard({
  job,
}: {
  job: WorkbenchJobTinyFragment
}) {
  const { id, prompt, status, insertedAt, user, workbench } = job
  if (!workbench) return null

  return (
    <JobCardSC>
      <CardTargetLinkSC
        to={getWorkbenchJobAbsPath({ workbenchId: workbench.id, jobId: id })}
        aria-label={`Open job: ${truncate(prettifyPrompt(prompt ?? ''), { length: 80 })}`}
      />
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
      <UsageRowSC as={CardRaisedSC}>
        <WorkbenchUsageChips
          usage={job.usage}
          budget={job.modes?.budget}
          error={job.error}
        />
      </UsageRowSC>
      <BottomSectionSC>
        <DividerSC />
        <CardActionsRowSC as={CardRaisedSC}>
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
})

const JobCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  minHeight: 140,
  ...clickableCardStyles(theme),
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
