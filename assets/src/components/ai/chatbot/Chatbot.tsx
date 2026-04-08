import { usePrevious } from '@pluralsh/design-system'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext.tsx'
import { isEmpty } from 'lodash'
import { useEffect, useMemo } from 'react'
import { useChatThreadMessagesQuery } from '../../../generated/graphql.ts'
import { mapExistingNodes } from '../../../utils/graphql.ts'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData.tsx'
import { AIViewTypes, useChatbot, useChatbotContext } from '../AIContext.tsx'
import { ChatbotAgentInit } from './ChatbotAgentInit.tsx'

import { ChatbotActionsPanel } from './actions-panel/ChatbotActionsPanel.tsx'
import { MainChatbotButton } from './ChatbotButton.tsx'
import { ChatbotHeader } from './ChatbotHeader.tsx'
import { ChatbotPanelThread } from './ChatbotPanelThread.tsx'
import { McpServerShelf } from './tools/McpServerShelf.tsx'
import { ChatbotPanelInfraResearch } from './ChatbotPanelInfraResearch.tsx'
import { SidePanelContent } from './SidePanelShared.tsx'

export function ChatbotLauncher() {
  const { open, setOpen } = useChatbotContext()
  const settings = useDeploymentSettings()

  if (!settings.ai?.enabled || open) return null

  return <MainChatbotButton onClick={() => setOpen(true)} />
}

export function ChatbotPanelContent() {
  const { currentThread, currentThreadId, agentInitMode, viewType } =
    useChatbot()
  const { data, loading, error, fetchNextPage, pageInfo, refetch } =
    useFetchPaginatedData(
      {
        skip: !currentThreadId,
        queryHook: useChatThreadMessagesQuery,
        keyPath: ['chatThread', 'chats'],
        pollInterval: 0, // don't poll messages, they shouldn't change except when agent is running
      },
      { id: currentThreadId ?? '' }
    )

  // refetch new messages when thread marks itself done (might miss if agent does everything between poll intervals but that's alright)
  const prevIsDone = usePrevious(currentThread?.session?.done)
  useEffect(() => {
    if (!!currentThread?.session?.done && !prevIsDone) refetch()
  }, [currentThread?.session?.done, prevIsDone, refetch])

  const messages = useMemo(
    () =>
      currentThreadId
        ? mapExistingNodes(data?.chatThread?.chats).toReversed()
        : [],
    [currentThreadId, data?.chatThread?.chats]
  )

  return (
    <>
      {!isEmpty(currentThread?.tools) && <McpServerShelf zIndex={2} />}
      {currentThread?.session && !agentInitMode && (
        <ChatbotActionsPanel
          zIndex={1}
          messages={messages}
        />
      )}
      <SidePanelContent>
        <ChatbotHeader />
        {!!agentInitMode ? (
          <ChatbotAgentInit />
        ) : viewType === AIViewTypes.InfraResearch ? (
          <ChatbotPanelInfraResearch />
        ) : (
          <ChatbotPanelThread
            messages={messages}
            initLoading={
              loading && (!data || data.chatThread?.id !== currentThread?.id)
            }
            error={error}
            fetchNextPage={fetchNextPage}
            isLoadingNextPage={!!data && loading && messages.length >= 25}
            hasNextPage={pageInfo?.hasNextPage}
          />
        )}
      </SidePanelContent>
    </>
  )
}
