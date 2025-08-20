import {
  AppIcon,
  ArrowTopRightIcon,
  Card,
  CheckIcon,
  CopyIcon,
  Flex,
  GitForkIcon,
  GitHubLogoIcon,
  IconFrame,
  IconFrameProps,
  Spinner,
  TrashCanIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  AgentSessionFragment,
  AiRole,
  ChatType,
  ChatTypeAttributes,
  PrAutomationFragment,
  PullRequestFragment,
  useDeleteChatMutation,
} from 'generated/graphql'

import { ComponentPropsWithRef, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { useChatbot } from '../AIContext'
import { ChatMessageContent } from './ChatMessageContent'

export function ChatMessage({
  id,
  seq,
  content,
  role,
  threadId,
  type = ChatType.Text,
  attributes,
  pullRequest,
  prAutomation,
  confirm,
  confirmedAt,
  serverName,
  disableActions,
  highlightToolContent,
  updatedAt,
  session,
  ...props
}: {
  id?: string
  seq?: number
  content?: Nullable<string>
  role: AiRole
  threadId?: string
  type?: ChatType
  attributes?: Nullable<ChatTypeAttributes>
  pullRequest?: Nullable<PullRequestFragment>
  prAutomation?: Nullable<PrAutomationFragment>
  confirm?: Nullable<boolean>
  confirmedAt?: Nullable<string>
  serverName?: Nullable<string>
  disableActions?: boolean
  highlightToolContent?: boolean
  updatedAt?: Nullable<string>
  session?: Nullable<AgentSessionFragment>
} & Omit<ComponentPropsWithRef<typeof ChatMessageSC>, '$role' | 'content'>) {
  const [showActions, setShowActions] = useState(false)
  const rightAlign = role === AiRole.User

  return pullRequest ? (
    <PrChatMesssage
      url={pullRequest.url}
      title={pullRequest.title ?? ''}
    />
  ) : (
    <ChatMessageSC
      $role={role}
      {...props}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <ChatMessageContent
        id={id ?? ''}
        seq={seq}
        showActions={showActions && !disableActions}
        side={rightAlign ? 'right' : 'left'}
        content={content ?? ''}
        role={role}
        threadId={threadId}
        type={type}
        attributes={attributes}
        confirm={confirm}
        confirmedAt={confirmedAt}
        serverName={serverName}
        highlightToolContent={highlightToolContent}
        prAutomation={prAutomation}
        session={session}
      />
      {type !== ChatType.File && (
        <ChatMessageActions
          id={id ?? ''}
          seq={seq}
          content={content ?? ''}
          timestamp={updatedAt}
          show={showActions && !disableActions}
          side={rightAlign ? 'right' : 'left'}
        />
      )}
    </ChatMessageSC>
  )
}

export function ChatMessageActions({
  id,
  seq,
  content,
  timestamp,
  show = true,
  side,
  iconFrameType = 'tertiary',
  ...props
}: {
  id: string
  seq: number | undefined
  content: string
  timestamp?: Nullable<string>
  show?: boolean
  side: 'left' | 'right'
  iconFrameType?: IconFrameProps['type']
} & Omit<ComponentPropsWithRef<typeof ActionsWrapperSC>, '$show' | '$side'>) {
  const { forkThread, currentThread, mutationLoading } = useChatbot()
  const [copied, setCopied] = useState(false)

  const showCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const onDelete = () => !deleteLoading && deleteMessage({ variables: { id } })
  const onFork = () =>
    !mutationLoading && forkThread({ id: currentThread?.id ?? '', seq: seq })

  const [deleteMessage, { loading: deleteLoading }] = useDeleteChatMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadMessages'],
  })

  return (
    <ActionsWrapperSC
      onClick={(e) => e.stopPropagation()}
      $show={show}
      $side={side}
      {...props}
    >
      {timestamp && side === 'right' && (
        <CaptionP $color="text-light">
          {formatDateTime(timestamp, 'h:mma')}
        </CaptionP>
      )}
      <Flex gap="xxsmall">
        <WrapWithIf
          condition={!copied}
          wrapper={
            <CopyToClipboard
              text={content}
              onCopy={showCopied}
            />
          }
        >
          <IconFrame
            clickable
            as="div"
            tooltip="Copy to clipboard"
            type={iconFrameType}
            icon={
              copied ? (
                <CheckIcon color="icon-success" />
              ) : (
                <CopyIcon color="icon-xlight" />
              )
            }
          />
        </WrapWithIf>
        <IconFrame
          clickable
          as="div"
          tooltip="Fork thread from this message"
          type={iconFrameType}
          onClick={onFork}
          icon={
            mutationLoading ? <Spinner /> : <GitForkIcon color="icon-xlight" />
          }
        />
        <IconFrame
          clickable
          as="div"
          tooltip="Delete message"
          type={iconFrameType}
          onClick={onDelete}
          icon={
            deleteLoading ? <Spinner /> : <TrashCanIcon color="icon-danger" />
          }
        />
      </Flex>
      {timestamp && side === 'left' && (
        <CaptionP $color="text-light">
          {formatDateTime(timestamp, 'h:mma')}
        </CaptionP>
      )}
    </ActionsWrapperSC>
  )
}

function PrChatMesssage({ url, title }: { url: string; title: string }) {
  const theme = useTheme()
  return (
    <Flex
      paddingLeft={theme.spacing.xxxlarge}
      paddingRight={theme.spacing.xxxlarge}
      paddingTop={theme.spacing.small}
      paddingBottom={theme.spacing.small}
      direction="column"
      gap="xsmall"
    >
      <CaptionP $color="text-light">PR generated from chat context</CaptionP>
      <PrLinkoutCard
        url={url}
        title={title}
      />
    </Flex>
  )
}

export function PrLinkoutCard({ url, title }: { url: string; title: string }) {
  const theme = useTheme()
  return (
    <Card
      clickable
      onClick={() => {
        window.open(url, '_blank')
      }}
      css={{
        padding: `${theme.spacing.small}px ${theme.spacing.large}px`,
        width: '100%',
      }}
    >
      <Flex
        justify="space-between"
        align="center"
      >
        <Flex
          gap="medium"
          align="center"
        >
          <AppIcon
            icon={<GitHubLogoIcon size={32} />}
            size="xsmall"
          />
          <Body2BoldP $color="text-light">{title}</Body2BoldP>
        </Flex>
        <ArrowTopRightIcon
          color="icon-light"
          size={20}
        />
      </Flex>
    </Card>
  )
}

const ActionsWrapperSC = styled.div<{
  $show: boolean
  $side: 'left' | 'right'
}>(({ theme, $show, $side }) => ({
  display: 'flex',
  width: '100%',
  gap: theme.spacing.large,
  alignItems: 'center',
  opacity: $show ? 1 : 0,
  transition: '0.3s opacity ease',
  pointerEvents: $show ? 'auto' : 'none',
  justifyContent: $side === 'left' ? 'flex-start' : 'flex-end',
  padding: `${theme.spacing.xxxsmall}px 0`,
}))

const ChatMessageSC = styled.div<{ $role: AiRole }>(({ theme, $role }) => ({
  containerType: 'inline-size',
  containerName: 'chat-message',
  display: 'flex',
  overflow: 'hidden',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  position: 'relative',
  padding: theme.spacing.small,
  paddingBottom: $role === AiRole.Assistant ? theme.spacing.small : 0,
  width: '100%',
  alignItems: $role === AiRole.User ? 'flex-end' : 'flex-start',
}))
