import { CaretRightIcon, Chip, Flex } from '@pluralsh/design-system'
import { ToolCallKindIcon } from 'components/ai/chatbot/toolCallIcons'
import { ProgressRingGlyph } from 'components/workbenches/common/IssueStatusGlyph'
import {
  Body2BoldP,
  CaptionP,
  OverlineH3,
} from 'components/utils/typography/Text'
import {
  DevboxInteractionFragment,
  DevboxThreadFragment,
  DevboxToolCallFragment,
  WorkbenchJobStatus,
} from 'generated/graphql'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { JobStatusIcon } from '../WorkbenchJobsGroupedList'
import { DevboxInteraction } from './DevboxInteractionCard'
import { threadTitle } from './devboxThreads'
import {
  pendingInteractionsFor,
  SubagentState,
  subagentState,
} from './devboxSubagentState'

type ToolCallLookup = (
  toolCallId: Nullable<string>
) => Nullable<DevboxToolCallFragment>

const STATE_LABELS: Record<SubagentState, string> = {
  'needs you': 'Needs you',
  running: 'Running',
  failed: 'Failed',
  done: 'Done',
}

function SubagentStateIcon({ state }: { state: SubagentState }) {
  switch (state) {
    case 'needs you':
      return (
        <ProgressRingGlyph
          progress={0.75}
          color="icon-warning"
        />
      )
    case 'running':
      return <JobStatusIcon status={WorkbenchJobStatus.Running} />
    case 'failed':
      return <JobStatusIcon status={WorkbenchJobStatus.Failed} />
    default:
      return <JobStatusIcon status={WorkbenchJobStatus.Successful} />
  }
}

// a subagent in its parent's transcript: what it's doing, anything it needs
// answered, and a way into its own transcript
export function DevboxSubagentCard({
  subagent,
  interactions,
  activity,
  toolCall,
  onOpen,
}: {
  subagent: DevboxThreadFragment
  interactions: DevboxInteractionFragment[]
  activity: Nullable<string>
  toolCall: ToolCallLookup
  onOpen: () => void
}) {
  const state = subagentState(subagent, interactions)
  const pending = pendingInteractionsFor(subagent, interactions)
  return (
    <CardSC $attention={state === 'needs you'}>
      <OpenSC
        type="button"
        onClick={onOpen}
        aria-label={`Open subagent ${threadTitle(subagent)}`}
      >
        <ToolCallKindIcon kind="subagent" />
        <Flex
          direction="column"
          flex={1}
          minWidth={0}
        >
          <Flex
            gap="xsmall"
            align="center"
          >
            <TitleSC>{threadTitle(subagent)}</TitleSC>
            <Chip
              size="small"
              severity={state === 'needs you' ? 'warning' : 'neutral'}
              icon={<SubagentStateIcon state={state} />}
            >
              {STATE_LABELS[state]}
            </Chip>
          </Flex>
          <PreviewSC $color="text-xlight">
            {activity ||
              (state === 'running' ? 'Starting…' : 'Subagent session')}
          </PreviewSC>
        </Flex>
        <CaretRightIcon
          size={12}
          color="icon-xlight"
        />
      </OpenSC>
      {pending.map((interaction) => (
        <DevboxInteraction
          key={interaction.id}
          interaction={interaction}
          toolCall={toolCall(interaction.toolCallId)}
        />
      ))}
    </CardSC>
  )
}

// active subagents above the composer, with their questions answerable in place
export function DevboxSubagentShelf({
  subagents,
  interactions,
  toolCall,
  onOpen,
}: {
  subagents: DevboxThreadFragment[]
  interactions: DevboxInteractionFragment[]
  toolCall: ToolCallLookup
  onOpen: (subagent: DevboxThreadFragment) => void
}) {
  if (!subagents.length) return null
  return (
    <ShelfSC aria-label="Active subagents">
      <OverlineH3 $color="text-xlight">
        Subagents · {subagents.length} active
      </OverlineH3>
      {subagents.map((subagent) => {
        const state = subagentState(subagent, interactions)
        return (
          <Flex
            key={subagent.id}
            direction="column"
            gap="xsmall"
          >
            <ShelfRowSC
              type="button"
              onClick={() => onOpen(subagent)}
            >
              <SubagentStateIcon state={state} />
              <TitleSC>{threadTitle(subagent)}</TitleSC>
              <CaptionP $color="text-xlight">
                {STATE_LABELS[state]}
                {subagent.lastActivityAt
                  ? ` · ${fromNow(subagent.lastActivityAt)}`
                  : ''}
              </CaptionP>
              <CaretRightIcon
                size={12}
                color="icon-xlight"
              />
            </ShelfRowSC>
            {pendingInteractionsFor(subagent, interactions).map(
              (interaction) => (
                <DevboxInteraction
                  key={interaction.id}
                  interaction={interaction}
                  toolCall={toolCall(interaction.toolCallId)}
                  compact
                />
              )
            )}
          </Flex>
        )
      })}
    </ShelfSC>
  )
}

const CardSC = styled.div<{ $attention: boolean }>(({ theme, $attention }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  border: `1px solid ${
    $attention ? theme.colors['border-warning'] : theme.colors.border
  }`,
  backgroundColor: theme.colors['fill-one'],
}))

const OpenSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: '100%',
  minWidth: 0,
  padding: theme.spacing.xxsmall,
  borderRadius: theme.borderRadiuses.medium,
  textAlign: 'left',
  cursor: 'pointer',
  '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const TitleSC = styled(Body2BoldP)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
})

const PreviewSC = styled(CaptionP)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const ShelfSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  backgroundColor: theme.colors['fill-one'],
  maxHeight: 280,
  overflowY: 'auto',
}))

const ShelfRowSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minWidth: 0,
  padding: `${theme.spacing.xxsmall} ${theme.spacing.xsmall}`,
  borderRadius: theme.borderRadiuses.medium,
  textAlign: 'left',
  cursor: 'pointer',
  '&:hover': { backgroundColor: theme.colors['fill-one-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
  '& > :nth-child(2)': { flex: 1 },
}))
