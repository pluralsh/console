import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
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
