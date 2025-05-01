import { ApolloCache, ApolloError } from '@apollo/client'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import {
  AiInsightFragment,
  AiInsightSummaryFragment,
  ChatThreadAttributes,
  ChatThreadDetailsDocument,
  ChatThreadFragment,
  CloneChatThreadMutation,
  CloneChatThreadMutationVariables,
  useChatThreadDetailsQuery,
  useCloneChatThreadMutation,
  useCreateChatThreadMutation,
} from 'generated/graphql.ts'
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  use,
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
  currentThread: Nullable<ChatThreadFragment>
  setCurrentThreadId: (threadId: Nullable<string>) => void
  currentInsight: Nullable<AiInsightSummaryFragment>
  setCurrentInsight: Dispatch<
    SetStateAction<Nullable<AiInsightSummaryFragment>>
  >
  threadLoading: boolean
  threadError: ApolloError | undefined
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
  const [currentThreadId, setCurrentThreadId] = useState<Nullable<string>>()
  const [currentInsight, setCurrentInsight] =
    useState<Nullable<AiInsightSummaryFragment>>()

  const {
    data: threadData,
    loading: threadLoading,
    error: threadError,
  } = useChatThreadDetailsQuery({
    variables: { id: currentThreadId ?? '' },
    skip: !currentThreadId,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  return (
    <ChatbotContext
      value={{
        open,
        setOpen,
        currentThread: threadData?.chatThread,
        setCurrentThreadId,
        fullscreen,
        setFullscreen,
        currentInsight,
        setCurrentInsight,
        threadLoading,
        threadError,
      }}
    >
      {children}
    </ChatbotContext>
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

  return <ExplainWithAIContext value={context}>{children}</ExplainWithAIContext>
}

export function useChatbotContext() {
  const context = use(ChatbotContext)
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider')
  }
  return context
}

export function useChatbot() {
  const {
    setOpen,
    currentThread,
    setCurrentThreadId,
    fullscreen,
    setFullscreen,
    currentInsight,
    setCurrentInsight,
    threadLoading,
    threadError,
  } = useChatbotContext()

  const [createThread, { loading: createLoading, error: createError }] =
    useCreateChatThreadMutation()
  const [forkThread, { loading: forkLoading, error: forkError }] =
    useCloneChatThreadMutation()

  return {
    createNewThread: (attributes: ChatThreadAttributes) => {
      createThread({
        variables: { attributes },
        onCompleted: (data) => {
          setCurrentThreadId(data.createThread?.id)
          setCurrentInsight(null)
          setOpen(true)
        },
        update: (cache, { data }) =>
          addThreadToCache(cache, data?.createThread),
      })
    },
    forkThread: ({
      id,
      seq,
      onCompleted,
    }: CloneChatThreadMutationVariables & {
      onCompleted?: (data: CloneChatThreadMutation) => void
    }) => {
      forkThread({
        variables: { id, seq },
        onCompleted: (data) => {
          setCurrentThreadId(data.cloneThread?.id)
          setCurrentInsight(null)
          setOpen(true)
          onCompleted?.(data)
        },
        update: (cache, { data }) => addThreadToCache(cache, data?.cloneThread),
      })
    },
    goToThread: (threadId: string) => {
      setCurrentThreadId(threadId)
      setCurrentInsight(null)
      setOpen(true)
    },
    goToInsight: (insight: AiInsightFragment) => {
      setCurrentThreadId(null)
      setCurrentInsight(insight)
      setOpen(true)
    },
    goToThreadList: () => {
      setCurrentThreadId(null)
      setCurrentInsight(null)
      setOpen(true)
    },
    closeChatbot: () => setOpen(false),
    currentThread,
    currentInsight,
    fullscreen,
    setFullscreen,
    loading: createLoading || forkLoading || threadLoading,
    error: createError || forkError || threadError,
  }
}

const addThreadToCache = (
  cache: ApolloCache<any>,
  thread: Nullable<ChatThreadFragment>
) => {
  if (!thread) return
  cache.writeQuery({
    query: ChatThreadDetailsDocument,
    variables: { id: thread.id },
    data: { chatThread: thread },
  })
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
