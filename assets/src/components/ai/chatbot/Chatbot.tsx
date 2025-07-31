import {
  Accordion,
  AccordionItem,
  ChatOutlineIcon,
} from '@pluralsh/design-system'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  useChatThreadDetailsQuery,
  useChatThreadsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'

import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { McpServerShelf } from './tools/McpServerShelf.tsx'
import { useResizablePane } from './useResizeableChatPane.tsx'
import { ChatbotActionsPanel } from './actions-panel/ChatbotActionsPanel.tsx'
import { mapExistingNodes } from '../../../utils/graphql.ts'
import { ChatbotAgentInit } from './ChatbotAgentInit.tsx'

const MIN_WIDTH = 500
const MAX_WIDTH_VW = 40
const HANDLE_THICKNESS = 20
export const CHATBOT_HEADER_HEIGHT = 57

export function ChatbotLauncher() {
  const { open, setOpen } = useChatbotContext()
  const settings = useDeploymentSettings()

  if (!settings.ai?.enabled || open) return null

  return (
    <ChatbotIconButton
      active={open}
      onClick={() => setOpen(true)}
    >
      <ChatOutlineIcon />
    </ChatbotIconButton>
  )
}

export function ChatbotPanel() {
  const { open } = useChatbotContext()
  return (
    <Accordion
      type="single"
      value={`${open}`}
      orientation="horizontal"
      css={{ border: 'none', zIndex: 1 }} // corresponds with zIndex={0} over main console content in Console.tsx
    >
      <AccordionItem
        value={`${true}`}
        caret="none"
        padding="none"
        trigger={null}
        css={{ height: '100%', width: '100%' }}
        additionalContentStyles={{ overflow: 'visible' }}
      >
        <ChatbotPanelInner />
      </AccordionItem>
    </Accordion>
  )
}

function ChatbotPanelInner() {
  const {
    currentThread,
    currentThreadId,
    persistedThreadId,
    selectedAgent,
    agentInitMode,
    goToThread,
    createNewThread,
    detailsError,
  } = useChatbot()
  const [showMcpServers, setShowMcpServers] = useState(false)
  const [showActionsPanel, setShowActionsPanel] = useState<boolean>(false)
  const [showPrompts, setShowPrompts] = useState<boolean>(false)

  const { data } = useFetchPaginatedData({
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

  const threads = useMemo(
    () => mapExistingNodes(data?.chatThreads),
    [data?.chatThreads]
  )

  useEffect(() => {
    // If the agent is initializing, a thread doesn't need to be selected.
    if (agentInitMode) return

    // If a thread is already selected, nothing needs to be done.
    if (!isEmpty(currentThreadId)) return

    // If data is not yet loaded, do nothing.
    if (!data) return

    // If there are no threads after an initial data load, create a new thread.
    if (isEmpty(threads)) {
      createNewThread({ summary: 'New chat with Plural Copilot' })
      return
    }

    // If there is a persisted thread, and it exists in the fetched threads, go to that thread.
    if (
      persistedThreadId &&
      threads?.find((thread) => thread?.id === persistedThreadId)
    ) {
      goToThread(persistedThreadId)
      return
    }

    // Otherwise, select the first available thread.
    goToThread(threads[0]?.id)
  }, [
    agentInitMode,
    createNewThread,
    currentThreadId,
    data,
    goToThread,
    persistedThreadId,
    threads,
  ])

  // optimistically updating when a user sends a message relies on using cache-first (default) fetch policy here
  // fresh data is fetched by the network in AIContext provider, where Apollo will populate the cache
  const threadDetailsQuery = useChatThreadDetailsQuery({
    skip: !currentThread,
    variables: { id: currentThread?.id ?? '' },
    onCompleted: (data) =>
      setShowPrompts(
        isEmpty(data.chatThread?.chats?.edges) &&
          !data.chatThread?.session?.type
      ),
  })
  const tools =
    threadDetailsQuery.data?.chatThread?.tools?.filter(isNonNullable) ?? []

  const { calculatedPanelWidth, dragHandleProps, isDragging } =
    useResizablePane(MIN_WIDTH, MAX_WIDTH_VW)
  return (
    <div
      css={{ position: 'relative', height: '100%' }}
      style={{ '--chatbot-panel-width': `${calculatedPanelWidth}px` }}
    >
      {!isEmpty(tools) && (
        <McpServerShelf
          zIndex={2}
          isOpen={showMcpServers}
          onClose={() => setShowMcpServers(false)}
          tools={tools}
        />
      )}
      {selectedAgent && !agentInitMode && (
        <ChatbotActionsPanel
          zIndex={1}
          isOpen={showActionsPanel}
        />
      )}
      <MainContentWrapperSC>
        <ChatbotHeader
          currentThread={currentThread}
          isActionsPanelOpen={showActionsPanel}
          setIsActionsPanelOpen={setShowActionsPanel}
        />
        {detailsError && <GqlError error={detailsError} />}
        {agentInitMode ? (
          <ChatbotAgentInit />
        ) : (
          currentThread && (
            <ChatbotPanelThread
              currentThread={currentThread}
              threadDetailsQuery={threadDetailsQuery}
              showMcpServers={showMcpServers}
              setShowMcpServers={setShowMcpServers}
              showExamplePrompts={showPrompts}
              setShowExamplePrompts={setShowPrompts}
            />
          )
        )}
      </MainContentWrapperSC>
      <DragHandleSC
        tabIndex={0}
        {...dragHandleProps}
        $isDragging={isDragging}
      />
    </div>
  )
}

const MainContentWrapperSC = styled.div(({ theme }) => ({
  position: 'relative',
  zIndex: theme.zIndexes.modal,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: 'var(--chatbot-panel-width)',
  borderLeft: theme.borders.default,
  background: theme.colors['fill-accent'],
}))

const DragHandleSC = styled.div<{ $isDragging: boolean }>(
  ({ theme, $isDragging }) => ({
    position: 'absolute',
    zIndex: theme.zIndexes.modal,
    left: -HANDLE_THICKNESS / 2,
    top: 0,
    width: HANDLE_THICKNESS,
    height: '100%',
    cursor: 'ew-resize',
    background: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
    // make the part the highlights while dragging a little thinner than full drag area
    '&::before': {
      content: '""',
      pointerEvents: 'none',
      width: HANDLE_THICKNESS / 4,
      background: $isDragging ? theme.colors['icon-primary'] : 'transparent',
      transition: 'background 0.2s ease-in-out',
    },
  })
)
