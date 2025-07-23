import {
  Accordion,
  AccordionItem,
  AppIcon,
  Button,
  Card,
  CaretRightIcon,
  Chip,
  Code,
  Divider,
  DocumentIcon,
  FileIcon,
  Flex,
  Markdown,
  PrQueueIcon,
  WrapWithIf,
} from '@pluralsh/design-system'

import isJson from 'is-json'

import styled, { useTheme } from 'styled-components'

import { GqlError } from 'components/utils/Alert'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  AiRole,
  ChatType,
  ChatTypeAttributes,
  PrAutomationFragment,
  useConfirmChatMutation,
  useConfirmChatPlanMutation,
  useDeleteChatMutation,
} from 'generated/graphql'
import { useState } from 'react'
import { ChatMessageActions } from './ChatMessage'
import { iconUrl } from 'utils/icon'
import { StackedText } from 'components/utils/table/StackedText'
import { CreatePrModal } from 'components/self-service/pr/automations/CreatePrModal'

type ChatMessageContentProps = {
  id?: string
  seq?: number
  role?: AiRole
  threadId?: string
  showActions?: boolean
  side?: 'left' | 'right'
  content: string
  type?: ChatType
  attributes?: Nullable<ChatTypeAttributes>
  prAutomation?: Nullable<PrAutomationFragment>
  confirm?: Nullable<boolean>
  confirmedAt?: Nullable<string>
  serverName?: Nullable<string>
  highlightToolContent?: boolean
}

export function ChatMessageContent({
  id,
  seq,
  role,
  threadId,
  showActions,
  side,
  content,
  type = ChatType.Text,
  attributes,
  prAutomation,
  confirm,
  confirmedAt,
  serverName,
  highlightToolContent = true,
}: ChatMessageContentProps) {
  const { spacing } = useTheme()
  switch (type) {
    case ChatType.File:
      return (
        <FileMessageContent
          id={id}
          seq={seq}
          showActions={showActions}
          side={side}
          content={content}
          attributes={attributes}
        />
      )
    case ChatType.Tool:
      return (
        <ToolMessageContent
          id={id}
          content={content}
          attributes={attributes}
          confirm={confirm}
          confirmedAt={confirmedAt}
          serverName={serverName}
          highlightToolContent={highlightToolContent}
        />
      )
    case ChatType.ImplementationPlan:
      return (
        <ImplementationPlanMessageContent
          content={content}
          threadId={threadId}
        />
      )
    case ChatType.PrCall:
      return (
        <PrCallContent
          prAutomation={prAutomation}
          threadId={threadId}
        />
      )
    case ChatType.Text:
    default:
      return (
        <WrapWithIf
          condition={!(role === AiRole.Assistant || role === AiRole.System)}
          wrapper={
            <Card
              css={{ padding: spacing.medium }}
              fillLevel={2}
            />
          }
        >
          <Markdown text={content ?? ''} />
        </WrapWithIf>
      )
  }
}

function FileMessageContent({
  id,
  seq,
  showActions,
  side,
  content,
  attributes,
}: ChatMessageContentProps) {
  const theme = useTheme()
  const fileName = attributes?.file?.name ?? ''
  return (
    <Accordion
      type="single"
      css={{ border: theme.borders.default }}
    >
      <AccordionItem
        padding="compact"
        caret="right"
        trigger={
          <Flex
            gap="small"
            align="center"
            wordBreak="break-word"
            marginRight={theme.spacing.small}
          >
            <FileIcon
              size={12}
              color="icon-light"
            />
            <CaptionP $color="text-light">{fileName || 'File'}</CaptionP>
            <ChatMessageActions
              id={id ?? ''}
              seq={seq}
              content={fileName}
              show={showActions}
              side={side ?? 'right'}
              iconFrameType="floating"
              css={{ position: 'absolute', right: 16, top: 4 }}
            />
          </Flex>
        }
        css={{
          background: theme.colors['fill-zero'],
          borderRadius: theme.borderRadiuses.large,
        }}
      >
        <Code css={{ background: theme.colors['fill-one'], maxWidth: '100%' }}>
          {content}
        </Code>
      </AccordionItem>
    </Accordion>
  )
}

function ImplementationPlanMessageContent({
  content,
  threadId,
}: ChatMessageContentProps) {
  const { spacing, colors } = useTheme()
  const [confirmPlan, { loading, error }] = useConfirmChatPlanMutation()

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Accordion
        type="single"
        css={{
          '&:has(:first-of-type button:hover)': {
            background: colors['fill-two-hover'],
          },
        }}
      >
        <AccordionItem
          padding="compact"
          caret="right"
          trigger={
            <Flex
              gap="small"
              align="center"
              wordBreak="break-word"
            >
              <DocumentIcon
                size={12}
                color="icon-light"
              />
              <CaptionP $color="text-light">Implementation Plan</CaptionP>
            </Flex>
          }
        >
          <div css={{ padding: spacing.xsmall }}>
            <Markdown text={content} />
          </div>
        </AccordionItem>
        <Divider
          css={{ margin: `0 ${spacing.small}px` }}
          backgroundColor={colors['border-fill-three']}
        />
        <Button
          small
          css={{ margin: spacing.small, alignSelf: 'flex-start' }}
          loading={loading}
          onClick={() =>
            confirmPlan({ variables: { threadId: threadId ?? '' } })
          }
        >
          Confirm plan
        </Button>
      </Accordion>
      {error && <GqlError error={error} />}
    </Flex>
  )
}

function PrCallContent({
  prAutomation,
  threadId,
}: Pick<ChatMessageContentProps, 'prAutomation' | 'threadId'>) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  if (!prAutomation) return <GqlError error="PR automation not found." />

  const { icon, darkIcon, name, documentation } = prAutomation

  return (
    <Flex
      direction="column"
      gap="xsmall"
      align="flex-start"
      width="fit-content"
    >
      <CaptionP $color="text-xlight">PR automation:</CaptionP>
      <Card css={{ padding: theme.spacing.xsmall, minWidth: 150 }}>
        <Flex
          alignItems="center"
          gap="xsmall"
        >
          <AppIcon
            size="xxsmall"
            url={iconUrl(icon, darkIcon, theme.mode)}
            icon={<PrQueueIcon />}
          />
          <StackedText
            first={name}
            second={documentation}
          />
        </Flex>
      </Card>
      <Button
        small
        css={{ alignSelf: 'flex-end' }}
        onClick={() => setOpen(true)}
      >
        Create PR
      </Button>
      <CreatePrModal
        prAutomation={prAutomation}
        threadId={threadId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Flex>
  )
}

enum MessageFormat {
  Json = 'json',
  Markdown = 'markdown',
}

const messageFormat = (message: string): MessageFormat => {
  if (isJson(message)) return MessageFormat.Json
  return MessageFormat.Markdown
}

const prettifyJson = (message: string): string => {
  try {
    const formatted = JSON.stringify(JSON.parse(message), null, 1)
    return formatted
  } catch (_) {
    return message
  }
}

function ToolMessageContent({
  id,
  content,
  attributes,
  confirm,
  confirmedAt,
  serverName,
}: Omit<ChatMessageContentProps, 'side'>) {
  const { spacing } = useTheme()
  const [openValue, setOpenValue] = useState('')
  const pendingConfirmation = confirm && !confirmedAt
  const format = messageFormat(content)
  const [deleteMessage, { loading: deleteLoading, error: deleteError }] =
    useDeleteChatMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails'],
    })
  const [confirmMessage, { loading: confirmLoading, error: confirmError }] =
    useConfirmChatMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails'],
    })

  return (
    <Flex
      direction="column"
      gap="xsmall"
      align="flex-end"
    >
      <CaptionP $color="text-xlight">
        {pendingConfirmation
          ? 'Pending confirmation'
          : 'Auto-generated toolcall'}
      </CaptionP>
      <ToolMessageWrapperSC>
        {(confirmError || deleteError) && (
          <GqlError error={confirmError || deleteError} />
        )}
        <Accordion
          type="single"
          value={openValue}
          onValueChange={setOpenValue}
          css={{ border: 'none', background: 'none' }}
        >
          <AccordionItem
            value={ARBITRARY_VALUE_NAME}
            padding="none"
            caret="none"
            trigger={
              <Flex
                justify="space-between"
                align="center"
                width="100%"
              >
                <Flex
                  gap="small"
                  align="center"
                  wordBreak="break-word"
                >
                  <CaretRightIcon
                    color="icon-light"
                    style={{
                      transition: 'transform 0.2s ease-in-out',
                      transform:
                        openValue === ARBITRARY_VALUE_NAME
                          ? 'rotate(90deg)'
                          : 'none',
                    }}
                  />
                  <CaptionP $color="text-light">
                    {serverName
                      ? `Called MCP tool for ${serverName}.${attributes?.tool?.name}`
                      : `Called tool ${attributes?.tool?.name ? attributes?.tool?.name : ''}`}
                  </CaptionP>
                </Flex>
                {serverName && <Chip size="small">{serverName}</Chip>}
              </Flex>
            }
          >
            <Flex
              direction="column"
              marginTop={spacing.small}
              gap="small"
            >
              {attributes?.tool?.arguments && (
                <div>
                  <Body2P $color="text-light">Arguments:</Body2P>
                  <ToolMessageContentSC>
                    <Code
                      language="json"
                      showHeader={false}
                      css={{ height: '100%', background: 'none' }}
                    >
                      {JSON.stringify(attributes?.tool?.arguments, null, 2)}
                    </Code>
                  </ToolMessageContentSC>
                </div>
              )}
              <div>
                <Body2P $color="text-light">Response:</Body2P>
                <ToolMessageContentSC>
                  {format === MessageFormat.Json && (
                    <Code
                      language="json"
                      showHeader={false}
                      css={{ height: '100%', background: 'none' }}
                    >
                      {prettifyJson(content)}
                    </Code>
                  )}
                  {format === MessageFormat.Markdown && (
                    <Card
                      css={{
                        padding: spacing.medium,
                        background: 'none',
                        height: '100%',
                      }}
                    >
                      <Markdown text={content} />
                    </Card>
                  )}
                </ToolMessageContentSC>
              </div>
            </Flex>
          </AccordionItem>
        </Accordion>
        {pendingConfirmation && (
          <Flex
            justify="flex-end"
            gap="small"
          >
            <Button
              secondary
              loading={deleteLoading}
              onClick={() => deleteMessage({ variables: { id: id ?? '' } })}
            >
              Cancel
            </Button>
            <Button
              loading={confirmLoading}
              onClick={() => confirmMessage({ variables: { id: id ?? '' } })}
            >
              Confirm
            </Button>
          </Flex>
        )}
      </ToolMessageWrapperSC>
    </Flex>
  )
}
const ToolMessageWrapperSC = styled.div(({ theme }) => ({
  width: 480,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  background: theme.colors['fill-one'],
  border: theme.borders.default,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
}))
const ToolMessageContentSC = styled.div(({ theme }) => ({
  maxHeight: 324,
  marginTop: theme.spacing.xxsmall,
  maxWidth: '100%',
  overflow: 'auto',
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.large,
}))
