import {
  ChatOutlineIcon,
  FillLevelProvider,
  ModalWrapper,
} from '@pluralsh/design-system'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  AiInsightFragment,
  ChatThreadFragment,
  useChatThreadsQuery,
} from 'generated/graphql'
import { ComponentPropsWithRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { useChatbot, useChatbotContext } from '../AIContext.tsx'
import { AITable } from '../AITable.tsx'
import { getInsightPathInfo, sortThreadsOrPins } from '../AITableEntry.tsx'
import { ChatbotIconButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import { ChatbotPanelInsight } from './ChatbotPanelInsight.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { HOME_CARD_CONTENT_HEIGHT } from '../../home/HomeCard.tsx'

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
    <FillLevelProvider value={1}>
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
          <FullHeightTableWrap
            css={{ backgroundColor: theme.colors['fill-one'] }}
          >
            <AITable
              modal
              flush={!fullscreen}
              query={threadsQuery}
              rowData={rows}
              css={{
                border: 'none',
                borderBottom: theme.borders['fill-two'],
                borderRadius: 0,
                maxHeight: HOME_CARD_CONTENT_HEIGHT,
              }}
            />
          </FullHeightTableWrap>
        )}
      </ChatbotFrameSC>
    </FillLevelProvider>
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
