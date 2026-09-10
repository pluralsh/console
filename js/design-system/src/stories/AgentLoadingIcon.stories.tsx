import { Div } from 'honorable'
import type { Meta, StoryObj } from '@storybook/react'
import { type ComponentProps, type ReactNode } from 'react'
import styled, { css, keyframes, useTheme } from 'styled-components'

import {
  AgentLoadingIcon,
  type AgentLoadingState,
  type AgentLoadingVariant,
} from '../components/AgentLoadingIcon'

const VARIANTS: AgentLoadingVariant[] = [
  'cursor',
  'cursorWave',
  'cursorEq',
  'slide',
  'wave',
  'pulse',
  'whimsy',
  'aaron',
  'paper',
  'paperLong',
]
const STATES: AgentLoadingState[] = [
  'working',
  'waiting',
  'idle',
  'success',
  'error',
]

const meta = {
  title: 'AgentLoadingIcon',
  component: AgentLoadingIcon,
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    state: { control: 'select', options: STATES },
    size: { control: { type: 'range', min: 8, max: 48, step: 1 } },
    columns: { control: { type: 'range', min: 2, max: 16, step: 1 } },
    rows: { control: { type: 'range', min: 2, max: 8, step: 1 } },
  },
} satisfies Meta<typeof AgentLoadingIcon>

export default meta
type Story = StoryObj<typeof AgentLoadingIcon>

const BoardSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: theme.spacing.medium,
  width: '100%',
}))

const CellSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  color: theme.colors.text,
  ...theme.partials.text.body2,
}))

const LabelSC = styled.span(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  '.name': {
    color: theme.colors.text,
  },
  '.meta': {
    color: theme.colors['text-xlight'],
    ...theme.partials.text.caption,
  },
}))

type SubagentId = 'coding' | 'integration' | 'canvas'

const WORKBENCH_SUBAGENTS: Array<{
  id: SubagentId
  name: string
  lines: string[]
  error?: string
}> = [
  {
    id: 'coding',
    name: 'Coding',
    lines: [
      'Created GitOps PR https://github.com/pluralsh/plrl-up-demos/pull/28…',
    ],
  },
  {
    id: 'integration',
    name: 'Integration',
    lines: [
      'Posted the requested follow-up comment on pluralsh/console#4104.',
      'Created the single-file GitOps deployment PR…',
      'Reported the GitOps deployment PR back to the source PR…',
    ],
  },
  {
    id: 'canvas',
    name: 'Canvas',
    lines: [
      'Created a minimal, status-focused demo deployment handoff canvas…',
    ],
    error: 'Failed to publish the canvas. Retry the subagent to continue.',
  },
]

const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`

const ChatSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  maxWidth: 560,
  padding: theme.spacing.medium,
  background: theme.colors['fill-zero'],
}))

const SubagentBlockSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}))

const TitleRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

const TitleSC = styled.span<{ $pending?: boolean }>(
  ({ theme, $pending }) => css`
    ${theme.partials.text.body2Bold}
    color: ${theme.colors['text-light']};

    .kind {
      font-weight: 400;
      color: ${theme.colors['text-xlight']};
    }

    ${
      $pending &&
      css`
        background: linear-gradient(
          90deg,
          ${theme.colors['text-xlight']} 40%,
          ${theme.colors.text} 50%,
          ${theme.colors['text-xlight']} 60%
        );
        background-size: 200% 100%;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        animation: ${shimmer} 2.4s linear infinite;
      `
    }
  `
)

const LineSC = styled.span<{ $pending?: boolean }>(
  ({ theme, $pending }) => css`
    ${theme.partials.text.body2}
    color: ${theme.colors['text-xlight']};

    ${
      $pending &&
      css`
        color: ${theme.colors['text-disabled']};
      `
    }
  `
)

const ErrorSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-danger'],
}))

function isLiveState(state?: AgentLoadingState) {
  return state === 'working' || state === 'waiting'
}

function WorkbenchChatMock({
  renderIcon,
  pending,
  states,
}: {
  renderIcon: (agent: SubagentId) => ReactNode
  pending?: SubagentId[]
  states?: Partial<Record<SubagentId, AgentLoadingState>>
}) {
  return (
    <ChatSC>
      {WORKBENCH_SUBAGENTS.map((agent) => {
        const state = states?.[agent.id]
        const showIcon = state != null || pending?.includes(agent.id)
        const live = state ? isLiveState(state) : pending?.includes(agent.id)

        return (
          <SubagentBlockSC key={agent.id}>
            <TitleRowSC>
              {showIcon && renderIcon(agent.id)}
              <TitleSC $pending={!!live}>
                {agent.name} <span className="kind">subagent</span>
              </TitleSC>
            </TitleRowSC>
            {agent.lines.map((line) => (
              <LineSC
                key={line}
                $pending={!!live}
              >
                {line}
              </LineSC>
            ))}
            {state === 'error' && agent.error && (
              <ErrorSC>{agent.error}</ErrorSC>
            )}
          </SubagentBlockSC>
        )
      })}
    </ChatSC>
  )
}

const PREVIEW_STATES: Record<SubagentId, AgentLoadingState> = {
  coding: 'working',
  integration: 'success',
  canvas: 'error',
}

function previewIcon(
  args: ComponentProps<typeof AgentLoadingIcon>,
  states: Record<SubagentId, AgentLoadingState> = PREVIEW_STATES
) {
  return (agent: SubagentId) => (
    <AgentLoadingIcon
      {...args}
      state={states[agent]}
    />
  )
}

export const Default: Story = {
  args: {
    size: 12,
    variant: 'cursor',
    state: 'working',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon(args)}
      states={PREVIEW_STATES}
    />
  ),
}

export const CursorWave: Story = {
  args: {
    size: 12,
    variant: 'cursorWave',
    state: 'waiting',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon(args, {
        ...PREVIEW_STATES,
        coding: 'waiting',
      })}
      states={{ ...PREVIEW_STATES, coding: 'waiting' }}
    />
  ),
}

export const CursorEq: Story = {
  args: {
    size: 12,
    variant: 'cursorEq',
    state: 'working',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon(args)}
      states={PREVIEW_STATES}
    />
  ),
}

export const Whimsy: Story = {
  args: {
    size: 16,
    variant: 'whimsy',
    state: 'working',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon(args)}
      states={PREVIEW_STATES}
    />
  ),
}

export const Paper: Story = {
  args: {
    size: 8,
    variant: 'paper',
    state: 'working',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon({ ...args, variant: 'paper' })}
      states={PREVIEW_STATES}
    />
  ),
}

export const PaperLong: Story = {
  args: {
    size: 12,
    variant: 'paperLong',
    state: 'working',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon({ ...args, variant: 'paperLong' })}
      states={PREVIEW_STATES}
    />
  ),
}

export const Aaron: Story = {
  args: {
    size: 18,
    variant: 'aaron',
    state: 'working',
  },
  render: (args) => (
    <WorkbenchChatMock
      renderIcon={previewIcon(args)}
      states={PREVIEW_STATES}
    />
  ),
}

export const Gallery: Story = {
  args: {
    size: 16,
  },

  render: (args) => {
    const theme = useTheme()
    const size = args.size ?? 16

    return (
      <Div
        padding="medium"
        backgroundColor={theme.colors['fill-zero']}
        width="100%"
      >
        <BoardSC>
          {VARIANTS.flatMap((variant) => {
            const states =
              variant === 'paper' || variant === 'paperLong'
                ? (['working', 'waiting'] satisfies AgentLoadingState[])
                : STATES

            return states.map((state) => (
              <CellSC key={`${variant}-${state}`}>
                <AgentLoadingIcon
                  size={size}
                  variant={variant}
                  state={state}
                />
                <LabelSC>
                  <span className="name">{variant}</span>
                  <span className="meta">{state}</span>
                </LabelSC>
              </CellSC>
            ))
          })}
        </BoardSC>
      </Div>
    )
  },
}
