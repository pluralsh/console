import {
  BrainIcon,
  CloseIcon,
  ComposeIcon,
  Flex,
  HamburgerMenuCollapseIcon,
  IconFrame,
  Spinner,
  Toast,
} from '@pluralsh/design-system'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  ChatThreadTinyFragment,
  useCloudConnectionsQuery,
  useUpdateChatThreadMutation,
} from 'generated/graphql'
import { useCallback } from 'react'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from '../AIContext'
import {
  getInsightPathInfo,
  TableEntryResourceLink,
  truncate,
} from '../AITableEntry'
import { ChatbotThreadMoreMenu } from './ChatbotThreadMoreMenu'
import { StackedText } from '../../utils/table/StackedText.tsx'
import { getFlowDetailsPath } from '../../../routes/flowRoutesConsts.tsx'

export function ChatbotHeader({
  currentThread,
}: {
  currentThread?: Nullable<ChatThreadTinyFragment>
}) {
  const { colors } = useTheme()

  const { closeChatbot, createNewThread, mutationLoading, mutationError } =
    useChatbot()

  const [
    updateThread,
    { loading: updateThreadLoading, error: updateThreadError },
  ] = useUpdateChatThreadMutation()

  const toggleKnowledgeGraph = useCallback(() => {
    updateThread({
      variables: {
        id: currentThread?.id ?? '',
        attributes: {
          summary: currentThread?.summary ?? '',
          settings: { memory: !currentThread?.settings?.memory },
        },
      },
    })
  }, [currentThread, updateThread])

  const { data: cloudConnections, loading: cloudConnectionsLoading } =
    useCloudConnectionsQuery()
  const connectionId = cloudConnections?.cloudConnections?.edges?.[0]?.node?.id

  const insightPathInfo = getInsightPathInfo(currentThread?.insight)
  const flowPath = currentThread?.flow && {
    path: [currentThread.flow.name],
    url: getFlowDetailsPath({ flowId: currentThread.flow.id }),
  }

  return (
    <WrapperSC>
      <IconFrame
        size="small"
        icon={<HamburgerMenuCollapseIcon />}
        // TODO: Clickable?
      />
      <Body2BoldP css={{ color: colors['text-light'] }}>Copilot</Body2BoldP>
      <StackedText
        first={truncate(currentThread?.summary)}
        second={<TableEntryResourceLink {...(insightPathInfo || flowPath)} />}
        firstPartialType="body2"
        firstColor="text"
        secondPartialType="caption"
        // TODO: Update styling.
      />
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
      <>
        <IconFrame
          tooltip={
            <Flex direction="column">
              <CaptionP $color="text-light">
                {currentThread?.settings?.memory ? 'Disable ' : 'Enable '}
                knowledge graph
              </CaptionP>
              <CaptionP $color="text-xlight">
                Use and add to Plural AI&#39;s memory with this thread
              </CaptionP>
            </Flex>
          }
          clickable
          type="tertiary"
          style={{
            borderColor: currentThread?.settings?.memory
              ? colors['border-primary']
              : undefined,
          }}
          icon={
            updateThreadLoading ? (
              <Spinner css={{ width: 16 }} />
            ) : (
              <BrainIcon css={{ width: 16 }} />
            )
          }
          onClick={toggleKnowledgeGraph}
        />
        <ChatbotThreadMoreMenu />
      </>
      <IconFrame
        clickable
        tooltip="Close"
        type="tertiary"
        icon={<CloseIcon css={{ width: 16 }} />}
        onClick={() => closeChatbot()}
      />
      <Toast
        show={!!updateThreadError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        Error updating thread settings.
      </Toast>
      <Toast
        show={!!mutationError}
        closeTimeout={5000}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        <strong>Error creating new thread:</strong> {mutationError?.message}
      </Toast>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  alignItems: 'center',
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
  maxHeight: 57,
}))
