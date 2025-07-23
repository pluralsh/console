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
  ChatThreadFragment,
  useChatThreadDetailsQuery,
  useChatThreadsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'
import { AITable } from '../AITable.tsx'
import { getInsightPathInfo, sortThreadsOrPins } from '../AITableEntry.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import {
  ChatbotMessagesWrapperSC,
  ChatbotPanelThread,
} from './ChatbotPanelThread.tsx'
import { McpServerShelf } from './tools/McpServerShelf.tsx'

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
  const theme = useTheme()
  const { pathname } = useLocation()
  const { currentThread, detailsLoading, detailsError } = useChatbot()
  const [showMcpServers, setShowMcpServers] = useState(false)
  const [showPrompts, setShowPrompts] = useState<boolean>(false)

  const threadsQuery = useFetchPaginatedData({
    skip: !!currentThread,
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

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

  const rows = useMemo(() => {
    const threads =
      threadsQuery.data?.chatThreads?.edges
        ?.map((edge) => edge?.node)
        .filter((node): node is ChatThreadFragment => Boolean(node))
        .sort(sortThreadsOrPins) ?? []
    // move all threads with a "current page" chip to the top
    const curPageThreads: ChatThreadFragment[] = []
    const otherThreads: ChatThreadFragment[] = []
    threads.forEach((thread) => {
      const insightUrl = getInsightPathInfo(thread.insight)?.url
      if (insightUrl && pathname?.includes(insightUrl))
        curPageThreads.push(thread)
      else otherThreads.push(thread)
    })
    return [...curPageThreads, ...otherThreads]
  }, [threadsQuery.data, pathname])

  return (
    <div css={{ position: 'relative', height: '100%' }}>
      {!isEmpty(tools) && (
        <McpServerShelf
          isOpen={showMcpServers}
          setIsOpen={setShowMcpServers}
          tools={tools}
        />
      )}
      <MainContentWrapperSC>
        <ChatbotHeader currentThread={currentThread} />
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
          <ChatbotTableWrapperSC>
            <AITable
              modal
              query={threadsQuery}
              rowData={rows}
              borderBottom={isEmpty(rows) ? 'none' : theme.borders['fill-two']}
              border="none"
              fillLevel={1}
              borderRadius={0}
            />
          </ChatbotTableWrapperSC>
        )}
      </MainContentWrapperSC>
    </div>
  )
}

const ChatbotTableWrapperSC = styled.div(() => ({
  height: '100%',
  overflow: 'hidden',
}))

const MainContentWrapperSC = styled.div(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: 'max(35vw, 450px)',
  borderLeft: theme.borders.default,
  background: theme.colors['fill-accent'],
}))
