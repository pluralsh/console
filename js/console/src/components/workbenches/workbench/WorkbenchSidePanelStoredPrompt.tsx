import { WorkbenchStoredPromptMarkdown } from './WorkbenchStoredPromptMarkdown'

export function WorkbenchSidePanelStoredPrompt({ prompt }: { prompt: string }) {
  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) return null

  return (
    <WorkbenchStoredPromptMarkdown
      text={trimmedPrompt}
      density="sidePanel"
    />
  )
}
