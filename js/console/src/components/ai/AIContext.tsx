import { ApolloCache } from '@apollo/client'
import { Toast } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { SidebarContext } from 'components/layout/Sidebar.tsx'
import {
  type SidePanel,
  useTopLevelSidePanel,
} from 'components/layout/TopLevelSidePanel.tsx'
import {
  ChatThreadAttributes,
  ChatThreadDetailsFragment,
  CloneChatThreadMutation,
  CloneChatThreadMutationVariables,
  useChatThreadDetailsQuery,
  useCloneChatThreadMutation,
  useCreateChatThreadMutation,
  useInfraResearchQuery,
} from 'generated/graphql.ts'
import { ChatThreadDetailsDocument } from 'generated/graphql-documents'
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  use,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import usePersistedState from '../hooks/usePersistedState.tsx'
import { useLegacyAiChatEnabled } from './useLegacyAiChatEnabled.ts'

type QueuedChatMessage = { message: string; threadId: string }

export enum AIViewTypes {
  ChatThread = 'CHAT_THREAD',
  InfraResearch = 'INFRA_RESEARCH',
}

type ChatbotContextT = {
  open: boolean
  setOpen: (open: boolean) => void

  viewType: AIViewTypes
  setViewType: (viewType: AIViewTypes) => void

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

  // used to render infra research view if it's the current ViewType
  currentResearchId: Nullable<string>
  setCurrentResearchId: (researchId: Nullable<string>) => void

  // the thread with the given ID will send this message, and then clear the value, next time it opens
  // particularly useful for cases where we want to create a new thread with an initial message (and want to guarantee the message isn't sent to the wrong place)
  queuedChatMessage: Nullable<QueuedChatMessage>
  setQueuedChatMessage: Dispatch<SetStateAction<Nullable<QueuedChatMessage>>>
}

const ChatbotContext = createContext<ChatbotContextT | undefined>(undefined)

export function AIContextProvider({ children }: { children: ReactNode }) {
  return <ChatbotContextProvider>{children}</ChatbotContextProvider>
}

const SIDE_PANEL_TYPE: SidePanel = 'ai-chat'

function ChatbotContextProvider({ children }: { children: ReactNode }) {
  const { spacing } = useTheme()
  const { setIsExpanded: setSidebarExpanded } = use(SidebarContext)
  const { sidePanel, setSidePanel, closeSidePanel } = useTopLevelSidePanel()
  const legacyChatEnabled = useLegacyAiChatEnabled()
  const open = sidePanel === SIDE_PANEL_TYPE

  useEffect(() => {
    if (!legacyChatEnabled && open) closeSidePanel(SIDE_PANEL_TYPE)
  }, [legacyChatEnabled, open, closeSidePanel])

  const [viewType, setViewType] = usePersistedState<AIViewTypes>(
    'plural-ai-view-type',
    AIViewTypes.ChatThread
  )
  const [actionsPanelOpen, setActionsPanelOpenState] = useState<boolean>(false)
  const [mcpPanelOpen, setMcpPanelOpenState] = useState<boolean>(false)

  const setActionsPanelOpen = useCallback((show: boolean) => {
    setActionsPanelOpenState(show)
    if (show) setMcpPanelOpenState(false)
  }, [])

  const setMcpPanelOpen = useCallback((show: boolean) => {
    setMcpPanelOpenState(show)
    if (show) setActionsPanelOpenState(false)
  }, [])
  const [currentThreadId, setCurrentThreadId] = usePersistedState<
    Nullable<string>
  >('plural-ai-current-thread-id', null)
  const [currentResearchId, setCurrentResearchId] = usePersistedState<
    Nullable<string>
  >('plural-ai-current-research-id', null)
  const [showForkToast, setShowForkToast] = useState(false)
  const [queuedChatMessage, setQueuedChatMessage] =
    useState<Nullable<QueuedChatMessage>>()

  const {
    data: threadData,
    loading: currentThreadLoading,
    error: threadError,
  } = useChatThreadDetailsQuery({
    skip: !currentThreadId || !open || viewType !== AIViewTypes.ChatThread,
    variables: { id: currentThreadId ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const { error: researchError } = useInfraResearchQuery({
    variables: { id: currentResearchId ?? '' },
    skip: !open || viewType !== AIViewTypes.InfraResearch,
    fetchPolicy: 'network-only',
    pollInterval: POLL_INTERVAL,
  })

  // should handle cases of stale ids being persisted
  useEffect(() => {
    if (currentThreadId && threadError) setCurrentThreadId(null)
    if (researchError) {
      setCurrentResearchId(null)
      setViewType(AIViewTypes.ChatThread)
    }
  }, [
    currentResearchId,
    currentThreadId,
    researchError,
    setCurrentResearchId,
    setCurrentThreadId,
    threadError,
    setViewType,
  ])

  const currentThread = threadData?.chatThread

  return (
    <ChatbotContext
      value={{
        open,
        setOpen: (open) => {
          if (open) {
            if (!legacyChatEnabled) return
            setSidePanel(SIDE_PANEL_TYPE)
            setSidebarExpanded(false)
          } else closeSidePanel(SIDE_PANEL_TYPE)
        },
        currentThread,
        currentThreadLoading,
        currentThreadId,
        setCurrentThreadId,
        currentResearchId,
        setCurrentResearchId,
        setShowForkToast,
        viewType,
        setViewType,
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

export function useChatbotContext() {
  const context = use(ChatbotContext)
  if (!context)
    throw new Error(
      'useChatbot must be used within AIContextProvider (see TopLevelSidePanelProviders in Console layout)'
    )

  return context
}

export function useChatbot() {
  const {
    open,
    setOpen,
    setViewType,
    setCurrentThreadId,
    setCurrentResearchId,
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
      setViewType(AIViewTypes.ChatThread)
      setCurrentResearchId(null)
      setOpen(true)
      if (queuedMessage && threadId)
        setQueuedChatMessage({ message: queuedMessage, threadId })
    },
    [
      setCurrentThreadId,
      setCurrentResearchId,
      setOpen,
      setQueuedChatMessage,
      setViewType,
    ]
  )

  const goToInfraResearch = useCallback(
    (researchId: string) => {
      setViewType(AIViewTypes.InfraResearch)
      setCurrentResearchId(researchId)
      setOpen(true)
    },
    [setCurrentResearchId, setOpen, setViewType]
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
          setViewType(AIViewTypes.ChatThread)
          setOpen(true)
          setShowForkToast(true)
          onCompleted?.(data)
        },
        update: (cache, { data }) => addThreadToCache(cache, data?.cloneThread),
      })
    },
    goToThread,
    goToInfraResearch,
    isChatbotOpen: open,
    closeChatbot: () => setOpen(false),
    mutationLoading: createLoading || forkLoading,
    mutationError: createError || forkError,
    setOpen,
    setCurrentThreadId,
    setCurrentResearchId,
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
