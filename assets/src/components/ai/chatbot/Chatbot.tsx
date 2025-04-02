import {
  ChatOutlineIcon,
  FillLevelProvider,
  ModalWrapper,
} from '@pluralsh/design-system'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  AiInsightFragment,
  ChatThreadFragment,
  ChatThreadTinyFragment,
  useChatThreadDetailsQuery,
  useChatThreadsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ComponentPropsWithRef, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'
import { AITable } from '../AITable.tsx'
import { getInsightPathInfo, sortThreadsOrPins } from '../AITableEntry.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import { ChatbotPanelInsight } from './ChatbotPanelInsight.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { McpServerShelf } from './McpServerShelf.tsx'
import { isNonNullable } from 'utils/isNonNullable.ts'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  fullscreen: boolean
  currentThread?: Nullable<ChatThreadTinyFragment>
  currentInsight?: Nullable<AiInsightFragment>
}

export function Chatbot() {
  const { open, setOpen, fullscreen, currentThread, currentInsight } =
    useChatbotContext()
  const settings = useDeploymentSettings()

  if (!settings.ai?.enabled) {
    return null
  }

  return (
    <div css={{ position: 'relative' }}>
      <ChatbotIconButton
        active={open}
        onClick={() => setOpen(true)}
      >
        <ChatOutlineIcon />
      </ChatbotIconButton>
      <ChatbotPanel
        fullscreen={fullscreen}
        open={open}
        currentThread={currentThread}
        currentInsight={currentInsight}
      />
    </div>
  )
}

export function ChatbotPanel({
  open,
  fullscreen = false,
  ...props
}: {
  open: boolean
} & ChatbotPanelInnerProps) {
  const theme = useTheme()
  const { closeChatbot } = useChatbot()
  return (
    <ModalWrapper
      overlayStyles={
        fullscreen
          ? {}
          : {
              background: 'none',
              padding: theme.spacing.medium,
              top: theme.spacing.xxxxlarge,
              left: 'unset',
            }
      }
      css={{ height: '100%' }}
      open={open}
      onOpenChange={closeChatbot}
      title="Ask Plural AI"
    >
      <ChatbotPanelInner
        fullscreen={fullscreen}
        {...props}
      />
    </ModalWrapper>
  )
}

function ChatbotPanelInner({
  fullscreen,
  currentThread,
  currentInsight,
  ...props
}: ChatbotPanelInnerProps) {
  const theme = useTheme()
  const { pathname } = useLocation()
  const [showMcpServers, setShowMcpServers] = useState(false)

  const threadsQuery = useFetchPaginatedData({
    skip: !!currentThread || !!currentInsight,
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

  // optimistically updating when a user sends a message relies on using cache-first (default) fetch policy here
  const threadDetailsQuery = useChatThreadDetailsQuery({
    skip: !currentThread,
    variables: { id: currentThread?.id ?? '' },
    pollInterval: 20000,
  })
  const shouldUseMCP = !!currentThread?.flow
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
    <ChatbotFrameSC
      $fullscreen={fullscreen}
      {...props}
    >
      {shouldUseMCP && (
        <McpServerShelf
          isOpen={showMcpServers}
          setIsOpen={setShowMcpServers}
          fullscreen={fullscreen}
          tools={tools}
        />
      )}
      <FillLevelProvider value={1}>
        <RightSideSC
          $showMcpServers={showMcpServers}
          $fullscreen={fullscreen}
        >
          <ChatbotHeader
            fullscreen={fullscreen}
            currentThread={currentThread}
            currentInsight={currentInsight}
          />
          {currentThread ? (
            <ChatbotPanelThread
              currentThread={currentThread}
              threadDetailsQuery={threadDetailsQuery}
              fullscreen={fullscreen}
              shouldUseMCP={shouldUseMCP}
              showMcpServers={showMcpServers}
              setShowMcpServers={setShowMcpServers}
            />
          ) : currentInsight ? (
            <ChatbotPanelInsight
              currentInsight={currentInsight}
              fullscreen={fullscreen}
            />
          ) : (
            <ChatbotTableWrapperSC $fullscreen={fullscreen}>
              <AITable
                modal
                query={threadsQuery}
                rowData={rows}
                borderBottom={
                  isEmpty(rows) ? 'none' : theme.borders['fill-two']
                }
                border="none"
                fillLevel={1}
                borderRadius={0}
              />
            </ChatbotTableWrapperSC>
          )}
        </RightSideSC>
      </FillLevelProvider>
    </ChatbotFrameSC>
  )
}

const ChatbotFrameSC = styled.div<{ $fullscreen?: boolean }>(
  ({ $fullscreen, theme }) => ({
    ...($fullscreen
      ? { '& > *': { boxShadow: theme.boxShadows.modal } }
      : {
          border: theme.borders['fill-two'],
          borderRadius: theme.borderRadiuses.large,
        }),
    display: 'flex',
    overflow: 'auto hidden',
    height: '100%',
    width: '100%',
    maxWidth: $fullscreen ? '75vw' : 1096,
  })
)

const ChatbotTableWrapperSC = styled.div<{ $fullscreen?: boolean }>(
  ({ $fullscreen, theme }) => ({
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.colors['fill-one'],
    ...($fullscreen && {
      border: theme.borders['fill-two'],
      borderRadius: theme.borderRadiuses.large,
    }),
  })
)

const RightSideSC = styled.div<{
  $fullscreen?: boolean
  $showMcpServers?: boolean
}>(({ $fullscreen, theme, $showMcpServers }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  width: 768,
  ...($showMcpServers && {
    borderLeft: theme.borders['fill-three'],
  }),
  ...($fullscreen && {
    gap: theme.spacing.medium,
  }),
}))
