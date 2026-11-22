import { AgentLoadingIcon, CaretDownIcon } from '@pluralsh/design-system'
import {
  resolveToolCallKind,
  toolCallTitle,
} from 'components/ai/chatbot/toolCallDisplay'
import { ToolCallKindIcon } from 'components/ai/chatbot/toolCallIcons'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import {
  DevboxInteractionFragment,
  DevboxThreadFragment,
  DevboxToolCallFragment,
} from 'generated/graphql'
import styled from 'styled-components'
import { DevboxInteraction } from './DevboxInteractionCard'
import { pendingInteractionsFor, subagentState } from './devboxSubagentState'
import { threadTitle } from './devboxThreads'
import { toolIdentity } from './DevboxTranscript'

type ToolCallLookup = (
  toolCallId: Nullable<string>
) => Nullable<DevboxToolCallFragment>

const STATUS_ICON_SIZE = 10

// a subagent in its parent's transcript, presented as a workbench job activity:
// its title and current tool, its task or answer, and anything it needs
// answered; the row opens its own transcript
export function DevboxSubagentActivity({
  subagent,
  running,
  interactions,
  summary,
  latestTool,
  toolCall,
  onOpen,
}: {
  subagent: DevboxThreadFragment
  running: boolean
  interactions: DevboxInteractionFragment[]
  summary: Nullable<string>
  latestTool: Nullable<DevboxToolCallFragment>
  toolCall: ToolCallLookup
  onOpen: () => void
}) {
  const state = subagentState(subagent, interactions)
  const pending = pendingInteractionsFor(subagent, interactions)
  const ended = !running && (state === 'done' || state === 'failed')
  return (
    <RowSC>
      <HeaderSC
        type="button"
        onClick={onOpen}
        aria-label={`Open subagent ${threadTitle(subagent)}`}
        $indent={running || ended}
      >
        <TitleRowSC>
          {running && (
            <StatusIconSC>
              <AgentLoadingIcon
                size={STATUS_ICON_SIZE}
                variant="cursorEq"
              />
            </StatusIconSC>
          )}
          {ended && (
            <StatusIconSC
              role="img"
              aria-label={state === 'failed' ? 'Failed' : 'Completed'}
            >
              <StatusDotSC $failed={state === 'failed'} />
            </StatusIconSC>
          )}
          <Body2BoldP
            as="span"
            className="title"
            $color="text-xlight"
            $shimmer={running}
          >
            {threadTitle(subagent)}
          </Body2BoldP>
          {running && latestTool && <LatestTool toolCall={latestTool} />}
          <CaretSC size={10} />
        </TitleRowSC>
        {summary && (
          <Body2P
            as="span"
            className="summary"
            $color={running ? 'text-xlight' : 'text-disabled'}
            $shimmer={running}
          >
            {summary}
          </Body2P>
        )}
      </HeaderSC>
      {pending.map((interaction) => (
        <DevboxInteraction
          key={interaction.id}
          interaction={interaction}
          toolCall={toolCall(interaction.toolCallId)}
        />
      ))}
    </RowSC>
  )
}

function LatestTool({ toolCall }: { toolCall: DevboxToolCallFragment }) {
  const { name, arguments: args } = toolIdentity(toolCall)
  const kind = resolveToolCallKind(name, args)
  const title = toolCall.title || toolCallTitle({ name, kind, args })
  return (
    <LatestToolSC title={title}>
      <ToolCallKindIcon kind={kind} />
      <Body2P
        as="span"
        $color="text-disabled"
        css={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Body2P>
    </LatestToolSC>
  )
}

const RowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  minWidth: 0,
}))

const CaretSC = styled(CaretDownIcon)(({ theme }) => ({
  color: theme.colors['icon-xlight'],
  flexShrink: 0,
  opacity: 0,
  rotate: '-90deg',
  transition: 'opacity 0.15s ease',
}))

const HeaderSC = styled.button<{ $indent: boolean }>(({ theme, $indent }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  width: 'fit-content',
  maxWidth: '100%',
  minWidth: 0,
  textAlign: 'left',
  cursor: 'pointer',
  [`&:hover ${CaretSC}, &:focus-visible ${CaretSC}`]: { opacity: 1 },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
  '.title': { flexShrink: 0 },
  '.summary': {
    display: 'block',
    minWidth: 0,
    maxWidth: '64ch',
    overflowX: 'clip',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ...($indent && {
      paddingLeft: `calc(${STATUS_ICON_SIZE}px + ${theme.spacing.xsmall})`,
    }),
  },
}))

const TitleRowSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  maxWidth: '100%',
  overflowX: 'clip',
}))

const StatusIconSC = styled.span({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: STATUS_ICON_SIZE,
  height: STATUS_ICON_SIZE,
})

const StatusDotSC = styled.span<{ $failed: boolean }>(({ theme, $failed }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: theme.colors[$failed ? 'icon-danger' : 'icon-success'],
}))

const LatestToolSC = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
  maxWidth: '40ch',
  flex: '0 1 auto',
}))
