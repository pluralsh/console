import {
  CloseIcon,
  ComposeIcon,
  Flex,
  HamburgerMenuCollapseIcon,
  IconFrame,
  Spinner,
  Toast,
} from '@pluralsh/design-system'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  ChatThreadTinyFragment,
  useCloudConnectionsQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { getFlowDetailsPath } from '../../../routes/flowRoutesConsts.tsx'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { useChatbot } from '../AIContext'
import { getInsightPathInfo, TableEntryResourceLink } from '../AITableEntry'
import { CHATBOT_HEADER_HEIGHT } from './Chatbot.tsx'
import { ChatbotThreadMoreMenu } from './ChatbotThreadMoreMenu'
import { AgentSelect } from './AgentSelect.tsx'
import { capitalize } from 'lodash'

export function ChatbotHeader({
  currentThread,
  isActionsPanelOpen,
  setIsActionsPanelOpen,
}: {
  currentThread?: Nullable<ChatThreadTinyFragment>
  isActionsPanelOpen: boolean
  setIsActionsPanelOpen: (isOpen: boolean) => void
}) {
  const { colors, spacing } = useTheme()

  const {
    agentInitMode,
    selectedAgent,
    closeChatbot,
    createNewThread,
    mutationLoading,
    mutationError,
  } = useChatbot()

  const { data: cloudConnections, loading: cloudConnectionsLoading } =
    useCloudConnectionsQuery()
  const connectionId = cloudConnections?.cloudConnections?.edges?.[0]?.node?.id

  const insightPathInfo = getInsightPathInfo(currentThread?.insight)
  const flowPath = currentThread?.flow && {
    path: [currentThread.flow.name],
    url: getFlowDetailsPath({ flowId: currentThread.flow.id }),
  }

  return (
    <Flex direction="column">
      <MainHeaderSC>
        {selectedAgent && !agentInitMode && (
          <div
            css={{
              transition: 'transform 0.16s ease-in-out',
              transform: isActionsPanelOpen ? 'scaleX(-1)' : 'scaleX(1)',
            }}
          >
            <IconFrame
              clickable
              size="small"
              tooltip={
                isActionsPanelOpen
                  ? 'Close actions panel'
                  : 'Open actions panel'
              }
              icon={<HamburgerMenuCollapseIcon />}
              onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
            />
          </div>
        )}
        <Body2BoldP css={{ color: colors['text-light'], flex: 1 }}>
          Copilot
        </Body2BoldP>
        <AgentSelect />
        <Flex gap="xsmall">
          {!cloudConnectionsLoading && (
            <IconFrame
              clickable
              icon={mutationLoading ? <Spinner /> : <ComposeIcon />}
              type="tertiary"
              tooltip="Start a new chat"
              onClick={() =>
                createNewThread({
                  summary: 'New chat with Plural Copilot',
                  ...(connectionId && {
                    session: {
                      connectionId,
                      done: true,
                    },
                  }),
                })
              }
            />
          )}
          <ChatbotThreadMoreMenu />
          <IconFrame
            clickable
            tooltip="Close"
            type="tertiary"
            icon={<CloseIcon css={{ width: 16 }} />}
            onClick={() => closeChatbot()}
          />
        </Flex>
      </MainHeaderSC>
      <SubHeaderSC>
        <StackedText
          truncate
          first={
            agentInitMode
              ? `New ${capitalize(agentInitMode)} agent session`
              : currentThread?.summary
          }
          second={<TableEntryResourceLink {...(insightPathInfo || flowPath)} />}
          firstPartialType="body2Bold"
          firstColor="text"
          secondPartialType="caption"
          css={{ flex: 1, paddingRight: spacing.large }}
        />
      </SubHeaderSC>
      <Toast
        show={!!mutationError}
        closeTimeout={5000}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating new thread:</strong> {mutationError?.message}
      </Toast>
    </Flex>
  )
}

const SubHeaderSC = styled.div(({ theme }) => ({
  height: 48,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing.medium}px`,
  borderBottom: theme.borders.default,
}))

const MainHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  alignItems: 'center',
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
  maxHeight: CHATBOT_HEADER_HEIGHT,
}))
