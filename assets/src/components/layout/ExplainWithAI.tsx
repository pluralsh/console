import { AiSparkleFilledIcon, Button } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'

type ExplainWithAIContextT = {
  prompt?: string
  setPrompt: Dispatch<SetStateAction<string | undefined>>
}

export const ExplainWithAIContext = createContext<
  ExplainWithAIContextT | undefined
>(undefined)

export const useExplainWithAIContext = (prompt?: string) => {
  const ctx = useContext(ExplainWithAIContext)

  if (!ctx) {
    console.warn(
      'useExplainWithAIContext() must be used within a ExplainWithAIContext'
    )
  }
  const { setPrompt } = ctx || {}

  useEffect(() => {
    setPrompt?.(prompt)

    return () => setPrompt?.(undefined)
  }, [setPrompt, prompt])
}

const gradientBorder = (theme, hover: boolean) => ({
  backgroundClip: 'padding-box, border-box',
  backgroundOrigin: 'border-box',
  backgroundImage: `linear-gradient(${theme.colors[hover ? 'fill-zero-selected' : 'fill-zero']}, ${theme.colors[hover ? 'fill-zero-selected' : 'fill-zero']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
  border: '1px solid transparent',
})

export default function ExplainWithAI() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <Button
      onClick={() => setOpen(true)}
      secondary
      small
      startIcon={<AiSparkleFilledIcon size={13} />}
      marginRight={66}
      width={163}
      {...(open
        ? {
            ...gradientBorder(theme, false),
            _hover: gradientBorder(theme, true),
          }
        : {})}
    >
      Explain with AI
    </Button>
  )
}
