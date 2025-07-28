import {
  Accordion,
  AccordionItem,
  ChatOutlineIcon,
} from '@pluralsh/design-system'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import LoadingIndicator from 'components/utils/LoadingIndicator.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  useChatThreadDetailsQuery,
  useChatThreadsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'

import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import {
  ChatbotMessagesWrapperSC,
  ChatbotPanelThread,
} from './ChatbotPanelThread.tsx'
import { McpServerShelf } from './tools/McpServerShelf.tsx'
import { useResizablePane } from './useResizeableChatPane.tsx'
import { ChatbotActionsPanel } from './actions-panel/ChatbotActionsPanel.tsx'

const MIN_WIDTH = 400
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
    goToThread,
    createNewThread,
    detailsLoading,
    detailsError,
  } = useChatbot()
  const [showMcpServers, setShowMcpServers] = useState(false)
  const [showActionsPanel, setShowActionsPanel] = useState<boolean>(false)
  const [showPrompts, setShowPrompts] = useState<boolean>(false)

  const { data } = useFetchPaginatedData({
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

  useEffect(() => {
    // If a thread is already selected, nothing needs to be done.
    // The context handles loading the last value from the persisted state.
    if (currentThreadId) return

    // If there are no threads, create a new one.
    if (isEmpty(data?.chatThreads?.edges)) {
      createNewThread({ summary: 'New chat with Plural Copilot' })
      return
    }

    // If there is at least one thread, select the first one.
    if (data?.chatThreads?.edges?.[0]?.node?.id) {
      goToThread(data.chatThreads.edges[0].node.id)
    }

    return
  }, [createNewThread, currentThreadId, data?.chatThreads?.edges, goToThread])

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
      {currentThread && (
        <ChatbotActionsPanel
          zIndex={1}
          isOpen={showActionsPanel}
          currentThread={currentThread}
        />
      )}
      <MainContentWrapperSC>
        <ChatbotHeader
          currentThread={currentThread}
          isActionsPanelOpen={showActionsPanel}
          setIsActionsPanelOpen={setShowActionsPanel}
        />
        {detailsError && <GqlError error={detailsError} />}
        {!currentThread && detailsLoading ? (
          <ChatbotMessagesWrapperSC>
            <LoadingIndicator />
          </ChatbotMessagesWrapperSC>
        ) : currentThread ? (
          <ChatbotPanelThread
            currentThread={currentThread}
            threadDetailsQuery={threadDetailsQuery}
            showMcpServers={showMcpServers}
            setShowMcpServers={setShowMcpServers}
            showExamplePrompts={showPrompts}
            setShowExamplePrompts={setShowPrompts}
          />
        ) : (
          'tbd'
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
