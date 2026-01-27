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

import { ComponentPropsWithRef, useRef, useState } from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import styled, { StyledObject, useTheme } from 'styled-components'
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
  isStreaming = false,
  toolDisplayType = 'accordion',
  userMsgWrapperStyle,
  isPending,
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
  disableActions?: false | 'keep-spacing' | 'no-spacing'
  highlightToolContent?: boolean
  updatedAt?: Nullable<string>
  session?: Nullable<AgentSessionFragment>
  isStreaming?: boolean
  toolDisplayType?: 'accordion' | 'simple'
  userMsgWrapperStyle?: StyledObject
  isPending?: boolean
} & Omit<ComponentPropsWithRef<typeof ChatMessageSC>, '$role' | 'content'>) {
  const [showActions, setShowActions] = useState(false)
  const actionsTimeoutRef = useRef<NodeJS.Timeout>(undefined)

  return pullRequest ? (
    <PrChatMesssage
      url={pullRequest.url}
      title={pullRequest.title ?? ''}
    />
  ) : (
    <ChatMessageSC
      $role={role}
      {...props}
      onMouseEnter={() => {
        setShowActions(true)
        if (type === ChatType.File)
          actionsTimeoutRef.current = setTimeout(
            () => setShowActions(false),
            3000
          )
      }}
      onMouseLeave={() => {
        setShowActions(false)
        if (actionsTimeoutRef.current) clearTimeout(actionsTimeoutRef.current)
      }}
    >
      <ChatMessageContent
        id={id ?? ''}
        seq={seq}
        showActions={showActions && !disableActions}
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
        isStreaming={isStreaming}
        toolDisplayType={toolDisplayType}
        userMsgWrapperStyle={userMsgWrapperStyle}
        isPending={isPending}
      />
      {type !== ChatType.File && disableActions !== 'no-spacing' && (
        <ChatMessageActions
          id={id ?? ''}
          seq={seq}
          content={content ?? ''}
          timestamp={updatedAt}
          show={showActions && !disableActions}
          side={role === AiRole.User ? 'right' : 'left'}
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
        padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
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
            icon={<GitHubLogoIcon size={24} />}
            size="xxsmall"
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
  justifyContent: $side === 'left' ? 'flex-start' : 'flex-end',
  padding: `${theme.spacing.xxxsmall}px 0`,
  pointerEvents: 'none',
  '& > *': { pointerEvents: $show ? 'auto' : 'none' },
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
