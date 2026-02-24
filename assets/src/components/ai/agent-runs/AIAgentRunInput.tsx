import { Flex, ListBoxItem, LogsIcon, Select } from '@pluralsh/design-system'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef'
import { GqlError } from 'components/utils/Alert'
import { AgentRunMode, useCreateAgentRunMutation } from 'generated/graphql'
import { capitalize } from 'lodash'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgentRunAbsPath } from 'routes/aiRoutesConsts'
import { ChatInputSimple, ChatOptionPill } from '../chatbot/input/ChatInput'
import { AIAgentRuntimesSelector } from './AIAgentRuntimesSelector'
import { AgentRunRepoSelector } from './AgentRunRepoSelector'
import usePersistedState from 'components/hooks/usePersistedState'

const PROMPT_KEY = 'ai-agent-run-prompt'
const MODE_KEY = 'ai-agent-run-mode'
const RUNTIME_ID_KEY = 'ai-agent-run-runtime-id'

export function AIAgentRunInput() {
  const navigate = useNavigate()
  const inputRef = useAutofocusRef()
  const [prompt, setPrompt] = usePersistedState<string>(PROMPT_KEY, '')
  const [mode, setMode] = usePersistedState<AgentRunMode>(
    MODE_KEY,
    AgentRunMode.Write
  )
  const [repository, setRepository] = useState<Nullable<string>>(null)
  const [runtimeId, setRuntimeId] = usePersistedState<Nullable<string>>(
    RUNTIME_ID_KEY,
    null
  )

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
        ref={inputRef}
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
            <AgentRunRepoSelector
              selectedRuntimeId={runtimeId}
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
      placement="left"
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
