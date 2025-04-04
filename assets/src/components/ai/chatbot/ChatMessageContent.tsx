import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CaretRightIcon,
  Chip,
  Code,
  FileIcon,
  Flex,
  Markdown,
} from '@pluralsh/design-system'

import isJson from 'is-json'

import styled, { useTheme } from 'styled-components'

import { CaptionP } from 'components/utils/typography/Text'
import {
  ChatType,
  ChatTypeAttributes,
  useConfirmChatMutation,
  useDeleteChatMutation,
} from 'generated/graphql'
import { ChatMessageActions } from './ChatMessage'
import { useState } from 'react'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { GqlError } from 'components/utils/Alert'

type ChatMessageContentProps = {
  id?: string
  showActions?: boolean
  content: string
  type?: ChatType
  attributes?: Nullable<ChatTypeAttributes>
  confirm?: Nullable<boolean>
  confirmedAt?: Nullable<string>
  serverName?: Nullable<string>
  highlightToolContent?: boolean
}

export function ChatMessageContent({
  id,
  showActions,
  content,
  type = ChatType.Text,
  attributes,
  confirm,
  confirmedAt,
  serverName,
  highlightToolContent = true,
}: ChatMessageContentProps) {
  switch (type) {
    case ChatType.File:
      return (
        <FileMessageContent
          id={id}
          showActions={showActions}
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
    case ChatType.Text:
    default:
      return <StandardMessageContent content={content} />
  }
}

function FileMessageContent({
  id,
  showActions,
  content,
  attributes,
}: ChatMessageContentProps) {
  const { spacing, colors } = useTheme()
  const fileName = attributes?.file?.name ?? ''
  return (
    <Accordion type="single">
      <AccordionItem
        padding="compact"
        caret="right"
        trigger={
          <Flex
            gap="small"
            align="center"
            wordBreak="break-word"
            marginRight={spacing.small}
          >
            <FileIcon
              size={12}
              color="icon-light"
            />
            <CaptionP $color="text-light">{fileName || 'File'}</CaptionP>
            <ChatMessageActions
              id={id ?? ''}
              content={fileName}
              show={showActions}
            />
          </Flex>
        }
      >
        <Code css={{ background: colors['fill-three'], maxWidth: '100%' }}>
          {content}
        </Code>
      </AccordionItem>
    </Accordion>
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
}: ChatMessageContentProps) {
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
                    {attributes?.tool?.name
                      ? `Called tool: "${attributes?.tool?.name}"`
                      : 'Called MCP tool'}
                  </CaptionP>
                </Flex>
                {serverName && <Chip size="small">{serverName}</Chip>}
              </Flex>
            }
          >
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
                <Card css={{ padding: spacing.medium, background: 'none' }}>
                  <Markdown text={content} />
                </Card>
              )}
            </ToolMessageContentSC>
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
  background: 'none',
  border: theme.borders.input,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
}))
const ToolMessageContentSC = styled.div(({ theme }) => ({
  height: 324,
  marginTop: theme.spacing.small,
  maxWidth: '100%',
  overflow: 'auto',
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.large,
}))

function StandardMessageContent({ content }: { content: string }) {
  const { spacing } = useTheme()
  return (
    <Card
      css={{ padding: spacing.medium }}
      fillLevel={2}
    >
      {content.split('\n').map((line, i, arr) => (
        <div
          key={`${i}-${line}`}
          css={{ display: 'contents' }}
        >
          {line}
          {i !== arr.length - 1 ? <br /> : null}
        </div>
      ))}
    </Card>
  )
}
