import { ApolloCache } from '@apollo/client'
import { Toast } from '@pluralsh/design-system'
import {
  AgentSessionType,
  ChatThreadAttributes,
  ChatThreadDetailsDocument,
  ChatThreadDetailsFragment,
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
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import usePersistedState from '../hooks/usePersistedState.tsx'
import { SidebarContext } from 'components/layout/Sidebar.tsx'

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

type QueuedChatMessage = { message: string; threadId: string }

export const AUTO_AGENT_TYPES = [
  AgentSessionType.Kubernetes,
  AgentSessionType.Terraform,
] as const

export type AutoAgentSessionT = Nullable<(typeof AUTO_AGENT_TYPES)[number]>

const isAutoAgentType = (
  type: Nullable<AgentSessionType>
): type is NonNullable<AutoAgentSessionT> => {
  return AUTO_AGENT_TYPES.includes(type as any)
}

type ChatbotContextT = {
  open: boolean
  setOpen: (open: boolean) => void

  actionsPanelOpen: boolean
  setActionsPanelOpen: (show: boolean) => void

  mcpPanelOpen: boolean
  setMcpPanelOpen: (show: boolean) => void

  setShowForkToast: (show: boolean) => void

  currentThread: Nullable<ChatThreadDetailsFragment>
  currentThreadLoading: boolean

  // this is the selected thread ID, updating it triggers currentThread to populate with its details
  currentThreadId: Nullable<string>
  setCurrentThreadId: (threadId: Nullable<string>) => void

  // The last non-agent thread ID, used to navigate back to the last non-agent thread when the agent is deselected.
  lastNonAgentThreadId: Nullable<string>
  setLastNonAgentThreadId: Dispatch<SetStateAction<Nullable<string>>>

  // The agent session type that is currently selected in the UI.
  // Coming from the current thread or the agent init mode.
  selectedAgent: AutoAgentSessionT

  // The agent session type that is currently selected in the UI but not yet applied to the current thread.
  agentInitMode: AutoAgentSessionT
  setAgentInitMode: Dispatch<SetStateAction<AutoAgentSessionT>>

  // the thread with the given ID will send this message, and then clear the value, next time it opens
  // particularly useful for cases where we want to create a new thread with an initial message (and want to guarantee the message isn't sent to the wrong place)
  queuedChatMessage: Nullable<QueuedChatMessage>
  setQueuedChatMessage: Dispatch<SetStateAction<Nullable<QueuedChatMessage>>>
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
  const { spacing } = useTheme()
  const { setIsExpanded: setSidebarExpanded } = use(SidebarContext)
  const [open, setOpenState] = usePersistedState('plural-ai-chat-open', false)
  const [actionsPanelOpen, setActionsPanelOpen] = useState<boolean>(false)
  const [mcpPanelOpen, setMcpPanelOpen] = useState<boolean>(false)
  const [currentThreadId, setCurrentThreadId] = usePersistedState<
    Nullable<string>
  >('plural-ai-current-thread-id', null)
  const [lastNonAgentThreadId, setLastNonAgentThreadId] =
    useState<Nullable<string>>()
  const [agentInitMode, setAgentInitMode] =
    usePersistedState<AutoAgentSessionT>('plural-ai-agent-init-mode', null)
  const [showForkToast, setShowForkToast] = useState(false)
  const [queuedChatMessage, setQueuedChatMessage] =
    useState<Nullable<QueuedChatMessage>>()

  const {
    data: threadData,
    loading: currentThreadLoading,
    error: threadError,
  } = useChatThreadDetailsQuery({
    skip: !currentThreadId,
    variables: { id: currentThreadId ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: 10_000,
  })
  // should handle cases of stale thread id being persisted
  useEffect(() => {
    if (currentThreadId && threadError) setCurrentThreadId(null)
  }, [currentThreadId, setCurrentThreadId, threadError])

  const currentThread = threadData?.chatThread

  const selectedAgent = useMemo(() => {
    const curType = currentThread?.session?.type
    return agentInitMode || (isAutoAgentType(curType) ? curType : null)
  }, [agentInitMode, currentThread?.session?.type])

  // keep track of the last non-agent thread ID
  useEffect(() => {
    if (!!currentThread?.id && !isAutoAgentType(currentThread.session?.type))
      setLastNonAgentThreadId(currentThread.id)
  }, [currentThread?.id, currentThread?.session?.type])

  return (
    <ChatbotContext
      value={{
        open,
        setOpen: (open) => {
          setOpenState(open)
          if (open) setSidebarExpanded(false)
        },
        currentThread,
        currentThreadLoading,
        currentThreadId,
        setCurrentThreadId,
        selectedAgent,
        agentInitMode,
        setAgentInitMode,
        lastNonAgentThreadId,
        setLastNonAgentThreadId,
        setShowForkToast,
        actionsPanelOpen,
        setActionsPanelOpen,
        mcpPanelOpen,
        setMcpPanelOpen,
        queuedChatMessage,
        setQueuedChatMessage,
      }}
    >
      {children}
      <Toast
        show={showForkToast}
        margin={spacing.medium}
        closeTimeout={3000}
        position="bottom"
        severity="success"
        onClose={() => setShowForkToast(false)}
      >
        Thread forked!
      </Toast>
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
    open,
    setOpen,
    setCurrentThreadId,
    lastNonAgentThreadId,
    setAgentInitMode,
    setShowForkToast,
    setQueuedChatMessage,
    ...restChatbotCtx
  } = useChatbotContext()

  const [createThread, { loading: createLoading, error: createError }] =
    useCreateChatThreadMutation()
  const [forkThread, { loading: forkLoading, error: forkError }] =
    useCloneChatThreadMutation()

  const goToThread = useCallback(
    (threadId: Nullable<string>, queuedMessage?: Nullable<string>) => {
      setCurrentThreadId(threadId)
      setAgentInitMode(null)
      setOpen(true)
      if (queuedMessage && threadId)
        setQueuedChatMessage({ message: queuedMessage, threadId })
    },
    [setAgentInitMode, setCurrentThreadId, setOpen, setQueuedChatMessage]
  )

  const createNewThread = (
    attributes: ChatThreadAttributes,
    initialMessage?: Nullable<string>
  ) => {
    return createThread({
      variables: { attributes: { session: { done: true }, ...attributes } },
      onCompleted: ({ createThread }) => {
        if (createThread?.id) goToThread(createThread.id, initialMessage)
      },
      update: (cache, { data }) => addThreadToCache(cache, data?.createThread),
    })
  }

  return {
    createNewThread,
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
          setOpen(true)
          setShowForkToast(true)
          onCompleted?.(data)
        },
        update: (cache, { data }) => addThreadToCache(cache, data?.cloneThread),
      })
    },
    goToThread,
    goToLastNonAgentThread: () => {
      if (!lastNonAgentThreadId) {
        createNewThread({ summary: 'New chat with Plural AI' })
        return
      }

      goToThread(lastNonAgentThreadId)
    },
    isChatbotOpen: open,
    closeChatbot: () => setOpen(false),
    mutationLoading: createLoading || forkLoading,
    mutationError: createError || forkError,
    setOpen,
    setCurrentThreadId,
    lastNonAgentThreadId,
    setAgentInitMode,
    setShowForkToast,
    setQueuedChatMessage,
    ...restChatbotCtx,
  }
}

const addThreadToCache = (
  cache: ApolloCache<any>,
  thread: Nullable<ChatThreadDetailsFragment>
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
