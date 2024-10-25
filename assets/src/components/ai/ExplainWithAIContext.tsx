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

const preface = `You're a seasoned DevOps engineer with experience in Kubernetes, GitOps and Infrastructure As Code,
and need to give a concise but clear summary of your companies Kubernetes infrastructure. 
The user is not necessarily an expert in the domain, so please provide as much documentation
and evidence as is necessary to explain what issue they're facing if there is any.
You should guide users to implement GitOps best practices,
so avoid telling them to manually modify resources via kubectl or helm commands directly,
although kubectl commands can be used for gathering further info to get better overview.`

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

const useExplainWithAIContext = () => {
  const ctx = useContext(ExplainWithAIContext)

  if (!ctx) {
    console.warn(
      'useExplainWithAIContext() must be used within a ExplainWithAIContext'
    )
  }

  return ctx
}

export const useExplainWithAI = (prompt?: string) => {
  const ctx = useExplainWithAIContext()

  const { setPrompt } = ctx || {}

  useEffect(() => {
    setPrompt?.(prompt)

    return () => setPrompt?.(undefined)
  }, [setPrompt, prompt])
}

export const useExplainWithAIPrompt = () => {
  const ctx = useExplainWithAIContext()

  return preface + '\n' + ctx?.prompt
}
