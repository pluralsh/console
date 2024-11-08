import { ChatOutlineIcon, ModalWrapper } from '@pluralsh/design-system'

import * as Dialog from '@radix-ui/react-dialog'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  AiInsightFragment,
  ChatThreadFragment,
  useChatThreadsQuery,
} from 'generated/graphql'
import { ComponentPropsWithRef, useMemo } from 'react'
import { VisuallyHidden } from 'react-aria'
import styled, { useTheme } from 'styled-components'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'
import { AITable } from '../AITable.tsx'
import { getInsightPathInfo, sortThreadsOrPins } from '../AITableEntry.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import { ChatbotPanelInsight } from './ChatbotPanelInsight.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { useLocation } from 'react-router-dom'

type ChatbotPanelInnerProps = ComponentPropsWithRef<typeof ChatbotFrameSC> & {
  fullscreen: boolean
  currentThread?: Nullable<ChatThreadFragment>
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
    >
      <ChatbotPanelInner
        fullscreen={fullscreen}
        {...props}
      />
      {/* required for accessibility */}
      <VisuallyHidden>
        <Dialog.Title>Ask Plural AI</Dialog.Title>
      </VisuallyHidden>
    </ModalWrapper>
  )
}

function ChatbotPanelInner({
  fullscreen,
  currentThread,
  currentInsight,
  ...props
}: ChatbotPanelInnerProps) {
  const { pathname } = useLocation()
  const threadsQuery = useFetchPaginatedData({
    skip: !!currentThread || !!currentInsight,
    queryHook: useChatThreadsQuery,
    keyPath: ['chatThreads'],
  })

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
      const insightUrl = getInsightPathInfo(thread.insight).url
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
      <ChatbotHeader
        fullscreen={fullscreen}
        currentThread={currentThread}
        currentInsight={currentInsight}
      />
      {currentThread ? (
        <ChatbotPanelThread
          currentThread={currentThread}
          fullscreen={fullscreen}
        />
      ) : currentInsight ? (
        <ChatbotPanelInsight
          currentInsight={currentInsight}
          fullscreen={fullscreen}
        />
      ) : (
        <FullHeightTableWrap>
          <AITable
            modal
            flush={!fullscreen}
            query={threadsQuery}
            rowData={rows}
          />
        </FullHeightTableWrap>
      )}
    </ChatbotFrameSC>
  )
}

const ChatbotFrameSC = styled.div<{ $fullscreen?: boolean }>(
  ({ $fullscreen, theme }) => ({
    ...($fullscreen
      ? {
          '& > *': {
            boxShadow: theme.boxShadows.modal,
          },
          gap: theme.spacing.medium,
        }
      : {
          border: theme.borders['fill-two'],
          borderRadius: theme.borderRadiuses.large,
        }),
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    width: $fullscreen ? '75vw' : 768,
  })
)
