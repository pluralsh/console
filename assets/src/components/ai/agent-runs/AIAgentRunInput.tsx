import {
  CaretDownIcon,
  Chip,
  Flex,
  ListBoxItem,
  LogsIcon,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { CaptionP } from 'components/utils/typography/Text'
import { AgentRunMode, useCreateAgentRunMutation } from 'generated/graphql'
import { capitalize } from 'lodash'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { ChatInputSimple, ChatOptionPill } from '../chatbot/input/ChatInput'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'

export function AIAgentRunInput() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState(AgentRunMode.Write)
  const [repository, setRepository] = useState<Nullable<string>>()
  const [runtimeId, setRuntimeId] = useState<Nullable<string>>()

  const [mutation, { loading, error }] = useCreateAgentRunMutation({
    variables: {
      runtimeId: runtimeId ?? '',
      attributes: { prompt, mode, repository: repository ?? '' },
    },
    onCompleted: ({ createAgentRun }) =>
      createAgentRun?.id &&
      navigate(getAgentRunAbsPath({ agentRunId: createAgentRun.id })),
    refetchQueries: ['AgentRuns'],
    awaitRefetchQueries: true,
  })

  return (
    <>
      {error && <GqlError error={error} />}
      <ChatInputSimple
        ref={(node) => node?.focus()}
        placeholder="Ask the agent to explore or make updates to your infrastructure."
        setValue={setPrompt}
        onSubmit={mutation}
        loading={loading}
        allowSubmit={!!prompt && !!runtimeId && !!mode && !!repository}
        options={
          <Flex
            gap="xsmall"
            align="center"
          >
            <AIAgentRuntimesSelector
              autoSelectDefault
              allowDeselect={false}
              selectedRuntimeId={runtimeId}
              setSelectedRuntimeId={setRuntimeId}
              type="pill"
            />
            <AgentRunTypeSelector
              selectedMode={mode}
              setSelectedMode={setMode}
            />
            <BasicRepoSelector
              selectedRepository={repository}
              setSelectedRepository={setRepository}
            />
          </Flex>
        }
      />
    </>
  )
}

function AgentRunTypeSelector({
  selectedMode,
  setSelectedMode,
}: {
  selectedMode: AgentRunMode
  setSelectedMode: (mode: AgentRunMode) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      width={160}
      leftContent={<LogsIcon />}
      selectedKey={selectedMode}
      onSelectionChange={(key) => setSelectedMode(key as AgentRunMode)}
      triggerButton={
        <ChatOptionPill isOpen={isOpen}>
          <LogsIcon size={12} />
          {selectedMode ?? 'Select mode'}
        </ChatOptionPill>
      }
    >
      {Object.values(AgentRunMode).map((mode) => {
        return (
          <ListBoxItem
            key={mode}
            label={capitalize(mode)}
          />
        )
      })}
    </Select>
  )
}

function BasicRepoSelector({
  selectedRepository,
  setSelectedRepository,
}: {
  selectedRepository: Nullable<string>
  setSelectedRepository: (repository: Nullable<string>) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      width={160}
      leftContent={<LogsIcon />}
      selectedKey={selectedRepository}
      onSelectionChange={(key) =>
        setSelectedRepository(key as Nullable<string>)
      }
      triggerButton={
        <Chip
          clickable
          size="large"
          css={{ border: 'none', backgroundColor: 'transparent' }}
        >
          <Flex
            align="center"
            gap="xsmall"
          >
            <CaptionP $color="text-xlight">
              {' '}
              {selectedRepository ?? 'Select repository'}
            </CaptionP>
            <CaretDownIcon
              size={10}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
              }}
            />
          </Flex>
        </Chip>
      }
    >
      {Object.values(AgentRunMode).map((mode) => {
        return (
          <ListBoxItem
            key={mode}
            label={capitalize(mode)}
          />
        )
      })}
    </Select>
  )
}
