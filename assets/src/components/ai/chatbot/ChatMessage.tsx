import {
  Card,
  CheckIcon,
  CopyIcon,
  Flex,
  IconFrame,
  PluralLogoMark,
  Spinner,
  TrashCanIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import { ComponentProps, forwardRef, ReactNode, Ref, useState } from 'react'
import styled, { CSSObject, useTheme } from 'styled-components'
import { aiGradientBorderStyles } from '../explain/ExplainWithAIButton'

import { AiRole, useDeleteChatMutation } from 'generated/graphql'
import CopyToClipboard from 'react-copy-to-clipboard'
import ChatbotMarkdown from './ChatbotMarkdown.tsx'

export const ChatMessage = forwardRef(
  (
    {
      id,
      content,
      role,
      disableActions,
      contentStyles,
      ...props
    }: {
      content: string
      role: AiRole
      disableActions?: boolean
      contentStyles?: CSSObject
    } & ComponentProps<typeof ChatMessageSC>,
    ref: Ref<HTMLLIElement>
  ) => {
    const theme = useTheme()
    const [showActions, setShowActions] = useState(false)
    let finalContent: ReactNode

    if (role === AiRole.Assistant || role === AiRole.System) {
      finalContent = <ChatbotMarkdown text={content} />
    } else {
      finalContent = content.split('\n\n').map((str, i) => (
        <Card
          key={i}
          css={{ padding: theme.spacing.medium }}
          fillLevel={2}
        >
          {str.split('\n').map((line, i, arr) => (
            <div
              key={`${i}-${line}`}
              css={{ display: 'contents' }}
            >
              {line}
              {i !== arr.length - 1 ? <br /> : null}
            </div>
          ))}
        </Card>
      ))
    }

    return (
      <ChatMessageSC
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        ref={ref}
        {...props}
      >
        <ChatMessageActions
          id={id ?? ''}
          content={content}
          show={showActions && !disableActions}
        />
        <Flex
          gap="medium"
          justify={role === AiRole.User ? 'flex-end' : 'flex-start'}
        >
          {role !== AiRole.User && <PluralAssistantIcon />}
          <div css={contentStyles}>{finalContent}</div>
        </Flex>
      </ChatMessageSC>
    )
  }
)

function ChatMessageActions({
  id,
  content,
  show,
}: {
  id: string
  content: string
  show: boolean
}) {
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
    <ActionsWrapperSC $show={show}>
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
          tooltip="Copy to clipboard"
          type="floating"
          size="medium"
          icon={copied ? <CheckIcon color="icon-success" /> : <CopyIcon />}
        />
      </WrapWithIf>
      <IconFrame
        clickable
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

const ActionsWrapperSC = styled.div<{ $show: boolean }>(({ theme, $show }) => ({
  position: 'absolute',
  top: theme.spacing.small,
  right: theme.spacing.small,
  display: 'flex',
  gap: theme.spacing.xsmall,
  opacity: $show ? 1 : 0,
  transition: '0.2s opacity ease',
  pointerEvents: $show ? 'auto' : 'none',
}))

const ChatMessageSC = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  position: 'relative',
  padding: theme.spacing.small,
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
