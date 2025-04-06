import {
  AppIcon,
  ArrowTopRightIcon,
  Card,
  CheckIcon,
  CopyIcon,
  Flex,
  GitHubLogoIcon,
  IconFrame,
  Markdown,
  PluralLogoMark,
  Spinner,
  TrashCanIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import { ComponentPropsWithRef, ReactNode, useState } from 'react'
import styled, { CSSObject, useTheme } from 'styled-components'
import { aiGradientBorderStyles } from '../explain/ExplainWithAIButton'

import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  AiRole,
  ChatType,
  ChatTypeAttributes,
  PullRequestFragment,
  useDeleteChatMutation,
} from 'generated/graphql'
import CopyToClipboard from 'react-copy-to-clipboard'
import { ChatMessageContent } from './ChatMessageContent'

export function ChatMessage({
  id,
  content,
  role,
  type = ChatType.Text,
  attributes,
  pullRequest,
  confirm,
  confirmedAt,
  serverName,
  disableActions,
  highlightToolContent,
  contentStyles,
  ...props
}: {
  id?: string
  content?: Nullable<string>
  role: AiRole
  type?: ChatType
  attributes?: Nullable<ChatTypeAttributes>
  pullRequest?: Nullable<PullRequestFragment>
  confirm?: Nullable<boolean>
  confirmedAt?: Nullable<string>
  serverName?: Nullable<string>
  disableActions?: boolean
  contentStyles?: CSSObject
  highlightToolContent?: boolean
} & Omit<ComponentPropsWithRef<typeof ChatMessageSC>, '$role' | 'content'>) {
  const [showActions, setShowActions] = useState(false)
  const [showActionsTimeout, setShowActionsTimeout] = useState<
    NodeJS.Timeout | undefined
  >(undefined)
  let finalContent: ReactNode
  const rightAlign = role === AiRole.User

  if (role === AiRole.Assistant || role === AiRole.System) {
    finalContent = <Markdown text={content ?? ''} />
  } else {
    finalContent = (
      <ChatMessageContent
        id={id ?? ''}
        showActions={showActions && !disableActions}
        content={content ?? ''}
        type={type}
        attributes={attributes}
        confirm={confirm}
        confirmedAt={confirmedAt}
        serverName={serverName}
        highlightToolContent={highlightToolContent}
      />
    )
  }

  return pullRequest ? (
    <PrChatMesssage
      url={pullRequest.url}
      title={pullRequest.title ?? ''}
    />
  ) : (
    <ChatMessageSC
      $role={role}
      {...props}
    >
      <Flex
        gap="medium"
        justify={rightAlign ? 'flex-end' : 'flex-start'}
      >
        {role !== AiRole.User && <PluralAssistantIcon />}
        <div
          onMouseEnter={() => {
            setShowActions(true)
            setShowActionsTimeout(setTimeout(() => setShowActions(false), 1600))
          }}
          onMouseLeave={() => {
            setShowActions(false)
            clearTimeout(showActionsTimeout)
          }}
          css={{
            overflow: 'hidden',
            flex: rightAlign ? undefined : 1,
            ...contentStyles,
          }}
        >
          {finalContent}
          <ChatMessageActions
            id={id ?? ''}
            content={content ?? ''}
            show={showActions && type !== ChatType.File && !disableActions}
          />
        </div>
      </Flex>
    </ChatMessageSC>
  )
}

export function ChatMessageActions({
  id,
  content,
  show = true,
  ...props
}: {
  id: string
  content: string
  show?: boolean
} & Omit<ComponentPropsWithRef<typeof ActionsWrapperSC>, '$show'>) {
  const [copied, setCopied] = useState(false)

  const showCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [deleteMessage, { loading: deleteLoading }] = useDeleteChatMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadDetails'],
  })

  return (
    <ActionsWrapperSC
      onClick={(e) => e.stopPropagation()}
      $show={show}
      {...props}
    >
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
          type="floating"
          size="medium"
          icon={copied ? <CheckIcon color="icon-success" /> : <CopyIcon />}
        />
      </WrapWithIf>
      <IconFrame
        clickable
        as="div"
        tooltip="Delete message"
        type="floating"
        size="medium"
        onClick={
          deleteLoading ? undefined : () => deleteMessage({ variables: { id } })
        }
        icon={
          deleteLoading ? <Spinner /> : <TrashCanIcon color="icon-danger" />
        }
      />
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
          gap="small"
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

const ActionsWrapperSC = styled.div<{ $show: boolean }>(({ theme, $show }) => ({
  position: 'absolute',
  zIndex: theme.zIndexes.tooltip,
  top: 4,
  right: theme.spacing.small,
  display: 'flex',
  gap: theme.spacing.xsmall,
  opacity: $show ? 1 : 0,
  transition: '0.3s opacity ease',
  pointerEvents: $show ? 'auto' : 'none',
}))

const ChatMessageSC = styled.div<{ $role: AiRole }>(({ theme, $role }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  position: 'relative',
  padding: theme.spacing.small,
  paddingBottom: $role === AiRole.Assistant ? theme.spacing.small : 0,
  width: '100%',
  justifySelf: $role === AiRole.User ? 'flex-end' : 'flex-start',
}))

function PluralAssistantIcon() {
  return (
    <AssistantIconWrapperSC>
      <PluralLogoMark
        width={16}
        height={16}
      />
    </AssistantIconWrapperSC>
  )
}

const AssistantIconWrapperSC = styled.div(({ theme }) => ({
  ...aiGradientBorderStyles(theme, 'fill-two'),
  width: theme.spacing.xlarge,
  height: theme.spacing.xlarge,
  borderRadius: theme.borderRadiuses.large,
  padding: theme.spacing.xsmall,
  svg: {
    transform: 'translateY(-1px) translateX(-1px)',
  },
}))
