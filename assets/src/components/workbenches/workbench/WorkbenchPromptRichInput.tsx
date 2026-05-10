import { ChatInputSimple } from 'components/ai/chatbot/input/ChatInput'
import type { ComponentProps } from 'react'

/**
 * Workbench prompt field with @ cluster/service/stack and / skill mention autocomplete,
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
  return (
    <ChatInputSimple
      key={syncKey}
      enableAutoComplete
      workbenchId={workbenchId}
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
