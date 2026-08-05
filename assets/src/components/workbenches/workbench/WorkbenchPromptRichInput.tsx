import { ChatInputSimple } from 'components/ai/chatbot/input/ChatInput'
import type { ComponentProps } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { WorkbenchOutletContext } from './Workbench'

/**
 * Workbench prompt field with @ cluster/service/stack/repository and / skill mention autocomplete,
 * matching `WorkbenchJobCreateInput` / `WorkbenchJobPromptInput`. Use `syncKey` when
 * replacing `prompt` from navigation or the server so the contenteditable remounts.
 */
export function WorkbenchPromptRichInput({
  workbenchId,
  prompt,
  onPromptChange,
  placeholder,
  disabled,
  loading,
  syncKey,
  wrapperStyles,
}: {
  workbenchId: Nullable<string>
  prompt: string
  onPromptChange: (next: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  syncKey?: string
  wrapperStyles?: ComponentProps<typeof ChatInputSimple>['wrapperStyles']
}) {
  const { workbench } = useOutletContext<WorkbenchOutletContext>()

  return (
    <ChatInputSimple
      key={syncKey}
      enableAutoComplete
      workbenchId={workbenchId}
      workbenchRepositorySource={workbench}
      deserializePlrlInitialValue
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
      initialValue={prompt}
      setValue={onPromptChange}
      onSubmit={() => {}}
      allowSubmit={false}
      submitOnEnter={false}
      showSubmitButton={false}
      wrapperStyles={{ minHeight: 90, ...wrapperStyles }}
    />
  )
}
