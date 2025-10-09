import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CaretRightIcon,
  CheckIcon,
  Chip,
  Code,
  Divider,
  DocumentIcon,
  FileIcon,
  Flex,
  IconFrame,
  Markdown,
  PrQueueIcon,
} from '@pluralsh/design-system'
import { CreatePrModal } from 'components/self-service/pr/automations/CreatePrModal'

import { GqlError } from 'components/utils/Alert'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  AgentSessionFragment,
  AiRole,
  ChatType,
  ChatTypeAttributes,
  PrAutomationFragment,
  PrCallAttributes,
  useConfirmChatMutation,
  useConfirmChatPlanMutation,
  useDeleteChatMutation,
} from 'generated/graphql'

import isJson from 'is-json'
import { ReactElement, useState } from 'react'

import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import styled, { useTheme } from 'styled-components'
import { iconUrl as getIconUrl } from 'utils/icon'
import { ChatMessageActions } from './ChatMessage'
import CloudObjectsCard from './tools/CloudObjectsCard.tsx'

type ChatMessageContentProps = {
  id?: string
  seq?: number
  role?: AiRole
  threadId?: string
  showActions?: boolean
  content: string
  type?: ChatType
  attributes?: Nullable<ChatTypeAttributes>
  prAutomation?: Nullable<PrAutomationFragment>
  confirm?: Nullable<boolean>
  confirmedAt?: Nullable<string>
  serverName?: Nullable<string>
  highlightToolContent?: boolean
  session?: Nullable<AgentSessionFragment>
}

export function ChatMessageContent({
  id,
  seq,
  role,
  threadId,
  showActions,
  content,
  type = ChatType.Text,
  attributes,
  prAutomation,
  confirm,
  confirmedAt,
  serverName,
  highlightToolContent = true,
  session,
}: ChatMessageContentProps) {
  switch (type) {
    case ChatType.File:
      return (
        <FileMessageContent
          id={id}
          seq={seq}
          showActions={showActions}
          role={role}
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
          session={session}
        />
      )
    case ChatType.PrCall:
      return (
        <PrCallContent
          prAutomation={prAutomation}
          threadId={threadId}
          session={session}
          attributes={attributes?.prCall}
        />
      )
    case ChatType.Text:
    default:
      return (
        <DefaultWrapperSC $role={role ?? AiRole.User}>
          <Markdown text={content ?? ''} />
        </DefaultWrapperSC>
      )
  }
}

function FileMessageContent({
  id,
  seq,
  showActions,
  role,
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
              side={role === AiRole.User ? 'right' : 'left'}
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
  session,
}: ChatMessageContentProps) {
  const { spacing, colors, borders, partials } = useTheme()
  const [confirmPlan, { loading, error }] = useConfirmChatPlanMutation({
    awaitRefetchQueries: true,
    refetchQueries: ['ChatThreadDetails'],
  })

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Accordion
        type="single"
        css={{
          background: colors['fill-zero'],
          border: borders.default,
        }}
      >
        <AccordionItem
          padding="relaxed"
          caret="right"
          trigger={
            <Flex
              gap="xsmall"
              align="center"
              wordBreak="break-word"
            >
              <IconFrame
                icon={
                  <DocumentIcon
                    size={12}
                    color="icon-light"
                  />
                }
                size="small"
              />
              <Body2BoldP $color="text">Implementation Plan</Body2BoldP>
            </Flex>
          }
        >
          <Markdown text={content} />
        </AccordionItem>
        <Divider
          css={{ margin: `0 ${spacing.medium}px` }}
          backgroundColor={colors['border']}
        />
        {!session?.planConfirmed ? (
          <Button
            small
            css={{ margin: spacing.medium, justifySelf: 'flex-end' }}
            loading={loading}
            onClick={() =>
              confirmPlan({ variables: { threadId: threadId ?? '' } })
            }
          >
            Approve
          </Button>
        ) : (
          <Flex
            gap="small"
            css={{ margin: spacing.medium, justifySelf: 'flex-end' }}
          >
            <span
              css={{
                ...partials.text.buttonSmall,
                color: colors['text-light'],
              }}
            >
              Approved
            </span>
            <CheckIcon />
          </Flex>
        )}
      </Accordion>
      {error && <GqlError error={error} />}
    </Flex>
  )
}

export function ChatbotCreatePrButton({
  prAutomation,
  threadId,
  session,
  attributes,
}: {
  prAutomation?: Nullable<PrAutomationFragment>
  threadId?: string
  session?: Nullable<AgentSessionFragment>
  attributes?: Nullable<PrCallAttributes>
}) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<boolean>(!!session?.pullRequest)

  if (!prAutomation) return null

  return !created ? (
    <>
      <Button
        small
        alignSelf="flex-end"
        onClick={() => setOpen(true)}
      >
        Create PR
      </Button>
      <CreatePrModal
        prAutomation={prAutomation}
        threadId={threadId}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => setCreated(true)}
        prCallAttributes={attributes}
      />
    </>
  ) : (
    <Flex
      gap="small"
      justifySelf="flex-end"
      margin={`${theme.spacing.xxsmall}px ${theme.spacing.medium}px`}
    >
      <span
        css={{
          ...theme.partials.text.buttonSmall,
          color: theme.colors['text-light'],
        }}
      >
        Created
      </span>
      <CheckIcon />
    </Flex>
  )
}

function PrCallContent({
  prAutomation,
  threadId,
  session,
  attributes,
}: Pick<ChatMessageContentProps, 'prAutomation' | 'threadId' | 'session'> & {
  attributes?: Nullable<PrCallAttributes>
}) {
  const theme = useTheme()

  if (!prAutomation) return <GqlError error="PR automation not found." />

  const { icon, darkIcon, name } = prAutomation
  const iconUrl = getIconUrl(icon, darkIcon, theme.mode)

  return (
    <Card
      css={{
        padding: theme.spacing.medium,
        minWidth: 150,
        maxWidth: '100%',
        background: theme.colors['fill-zero'],
        border: theme.borders.default,
      }}
    >
      <StretchedFlex gap="xlarge">
        <Flex
          alignItems="center"
          gap="xsmall"
          minWidth={0}
        >
          <IconFrame
            icon={
              iconUrl ? (
                <img
                  width={24}
                  height={24}
                  src={iconUrl}
                />
              ) : (
                <PrQueueIcon />
              )
            }
            size="xlarge"
            css={{ width: 32, height: 32 }}
          />
          <StackedText
            truncate
            first={name}
            firstPartialType="body2Bold"
            firstColor="text"
            second="PR automation"
          />
        </Flex>
        <ChatbotCreatePrButton
          prAutomation={prAutomation}
          threadId={threadId}
          session={session}
          attributes={attributes}
        />
      </StretchedFlex>
    </Card>
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
      refetchQueries: ['ChatThreadDetails', 'ChatThreadMessages'],
    })
  const [confirmMessage, { loading: confirmLoading, error: confirmError }] =
    useConfirmChatMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['ChatThreadDetails', 'ChatThreadMessages'],
    })

  return (
    <Flex
      direction="column"
      gap="xsmall"
      align="flex-end"
      width="100%"
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
      <ToolMessageDetails
        content={content}
        attributes={attributes}
      />
    </Flex>
  )
}
const ToolMessageWrapperSC = styled.div(({ theme }) => ({
  width: 480,
  maxWidth: '100%',
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

enum ToolCall {
  CloudQuery = '__plrl__cloud_query',
}

function ToolMessageDetails({ content, attributes }): ReactElement | null {
  if (!content) {
    return null
  }

  switch (attributes?.tool?.name) {
    case ToolCall.CloudQuery:
      return (
        <CloudObjectsCard
          content={content}
          query={attributes?.tool?.arguments?.query}
        />
      )
    default:
      return null
  }
}

const DefaultWrapperSC = styled.div<{ $role: AiRole }>(({ theme, $role }) => ({
  maxWidth: '100%',
  overflow: 'auto',
  ...(!($role === AiRole.Assistant || $role === AiRole.System) && {
    backgroundColor: theme.colors['fill-zero'],
    border: theme.borders.default,
    borderRadius: theme.borderRadiuses.large,
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  }),
}))
