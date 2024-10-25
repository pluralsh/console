import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type ExplainWithAIContextT = {
  prompt?: string
  setPrompt: Dispatch<SetStateAction<string | undefined>>
}

const ExplainWithAIContext = createContext<ExplainWithAIContextT | undefined>(
  undefined
)

export function ExplainWithAIContextProvider({
  children,
}: {
  children: ReactNode
}) {
  const [prompt, setPrompt] = useState<string | undefined>()
  const context = useMemo(() => ({ prompt, setPrompt }), [prompt, setPrompt])

  return (
    <ExplainWithAIContext.Provider value={context}>
      {children}
    </ExplainWithAIContext.Provider>
  )
}

export const useExplainWithAI = (prompt?: string) => {
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

export const useExplainWithAIPrompt = () => {
  const ctx = useContext(ExplainWithAIContext)

  if (!ctx) {
    console.warn(
      'useExplainWithAIContext() must be used within a ExplainWithAIContext'
    )
  }

  return ctx?.prompt
}
