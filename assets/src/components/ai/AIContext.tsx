import {
  AiInsightFragment,
  AiInsightSummaryFragment,
  ChatThreadAttributes,
  ChatThreadFragment,
  ChatThreadTinyFragment,
  useCreateChatThreadMutation,
} from 'generated/graphql.ts'
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
import usePersistedState from '../hooks/usePersistedState.tsx'

export enum AIVerbosityLevel {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

type ExplainWithAIContextT = {
  prompt?: string
  setPrompt: Dispatch<SetStateAction<string | undefined>>
  verbosityLevel: AIVerbosityLevel
  setVerbosityLevel: Dispatch<SetStateAction<AIVerbosityLevel>>
  system: string
}

type ChatbotContextT = {
  open: boolean
  setOpen: (open: boolean) => void
  fullscreen: boolean
  setFullscreen: Dispatch<SetStateAction<boolean>>
  currentThread: Nullable<ChatThreadTinyFragment>
  setCurrentThread: (thread: Nullable<ChatThreadTinyFragment>) => void
  currentInsight: Nullable<AiInsightSummaryFragment>
  setCurrentInsight: Dispatch<
    SetStateAction<Nullable<AiInsightSummaryFragment>>
  >
}

const ExplainWithAIContext = createContext<ExplainWithAIContextT | undefined>(
  undefined
)

const ChatbotContext = createContext<ChatbotContextT | undefined>(undefined)

export function AIContextProvider({ children }: { children: ReactNode }) {
  return (
    <ChatbotContextProvider>
      <ExplainWithAIContextProvider>{children}</ExplainWithAIContextProvider>
    </ChatbotContextProvider>
  )
}

function ChatbotContextProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [currentThread, setCurrentThread] =
    useState<Nullable<ChatThreadFragment>>()
  const [currentInsight, setCurrentInsight] =
    useState<Nullable<AiInsightSummaryFragment>>()

  const context = useMemo(
    () => ({
      open,
      setOpen,
      currentThread,
      setCurrentThread,
      fullscreen,
      setFullscreen,
      currentInsight,
      setCurrentInsight,
    }),
    [open, currentThread, fullscreen, currentInsight]
  )

  return (
    <ChatbotContext.Provider value={context}>
      {children}
    </ChatbotContext.Provider>
  )
}

function ExplainWithAIContextProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<string | undefined>()
  const [verbosityLevel, setVerbosityLevel] = usePersistedState(
    'plural-ai-verbosity-level',
    AIVerbosityLevel.High
  )

  const context = useMemo(
    () => ({
      prompt,
      setPrompt,
      verbosityLevel,
      setVerbosityLevel,
      system: verbosityLevelToSystem[verbosityLevel],
    }),
    [prompt, setPrompt, verbosityLevel, setVerbosityLevel]
  )

  return (
    <ExplainWithAIContext.Provider value={context}>
      {children}
    </ExplainWithAIContext.Provider>
  )
}

export function useChatbotContext() {
  const context = useContext(ChatbotContext)
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider')
  }
  return context
}

export function useChatbot() {
  const {
    setOpen,
    setCurrentThread,
    fullscreen,
    setFullscreen,
    setCurrentInsight,
  } = useChatbotContext()
  const [mutation, { loading, error }] = useCreateChatThreadMutation()
  // const navigate = useNavigate()

  return {
    createNewThread: (attributes: ChatThreadAttributes) => {
      mutation({
        variables: { attributes },
        onCompleted: (data) => {
          setCurrentThread(data.createThread)
          setCurrentInsight(null)
          setOpen(true)
        },
      })
    },
    goToThread: (thread: ChatThreadTinyFragment) => {
      setCurrentThread(thread)
      setCurrentInsight(null)
      setOpen(true)
    },
    goToInsight: (insight: AiInsightFragment) => {
      setCurrentThread(null)
      setCurrentInsight(insight)
      setOpen(true)
    },
    goToThreadList: () => {
      setCurrentThread(null)
      setCurrentInsight(null)
      setOpen(true)
    },
    closeChatbot: () => {
      setOpen(false)
    },
    fullscreen,
    setFullscreen,
    loading,
    error,
  }
}

export const useExplainWithAIContext = () => {
  const ctx = useContext(ExplainWithAIContext)

  if (!ctx) {
    throw Error(
      'useExplainWithAIContext() must be used within a ExplainWithAIContext'
    )
  }

  return ctx
}

export const useExplainWithAI = (prompt?: string) => {
  const ctx = useExplainWithAIContext()

  const { setPrompt } = ctx

  useEffect(() => {
    setPrompt?.(prompt)

    return () => setPrompt?.(undefined)
  }, [setPrompt, prompt])
}

const verbosityLevelToSystem = {
  [AIVerbosityLevel.Low]: `You're a seasoned DevOps engineer with experience in Kubernetes, GitOps and Infrastructure As Code,
and need to give a concise but clear explanation of an infrastructure problem that will likely involve either Kubernetes or Terraform. 
The user is not necessarily an expert in the domain, so please documentation and evidence to explain what issue they're facing. 
Give a short overview of the resource they are mentioning and any guidance on how they can learn more about how it works.
Keep your response to 1-2 sections.`,
  [AIVerbosityLevel.Medium]: `You're a seasoned DevOps engineer with experience in Kubernetes, GitOps and Infrastructure As Code,
and need to give a concise but clear explanation of an infrastructure problem that will likely involve either Kubernetes or Terraform. 
The user is not necessarily an expert in the domain, so please documentation and evidence to explain what issue they're facing. 
Give a short overview of the resource they are mentioning and any guidance on how they can learn more about how it works.
Keep your response to 3-5 sections.`,
  [AIVerbosityLevel.High]: `You're a seasoned DevOps engineer with experience in Kubernetes, GitOps and Infrastructure As Code,
and need to give a concise but clear explanation of an infrastructure problem that will likely involve either Kubernetes or Terraform. 
The user is not necessarily an expert in the domain, so please provide as much documentation
and evidence as is necessary to explain what issue they're facing. Give a descriptive overview of the resource they are mentioning
and any guidance on how they can learn more about how it works.`,
} as const satisfies Record<AIVerbosityLevel, string>
