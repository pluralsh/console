import {
  AiSparkleFilledIcon,
  ArrowUpIcon,
  Button,
  CaretDownIcon,
  Chip,
  Flex,
  SemanticColorKey,
  ServersIcon,
  SpinnerAlt,
} from '@pluralsh/design-system'
import { useAutofocusRef } from 'components/hooks/useAutofocusRef.tsx'
import usePersistedSessionState from 'components/hooks/usePersistedSessionState.tsx'
import { EditableDiv } from 'components/utils/EditableDiv.tsx'
import { SemanticPartialType } from 'components/utils/table/StackedText.tsx'
import { ChatThreadDetailsFragment } from 'generated/graphql.ts'
import { isEmpty, truncate } from 'lodash'
import {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  Dispatch,
  KeyboardEvent,
  ReactNode,
  RefObject,
  SetStateAction,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import styled, { StyledObject, useTheme } from 'styled-components'
import { useChatbot } from '../../AIContext.tsx'
import { MentionMenu } from './autocomplete/MentionMenu.tsx'
import { useMentionAutocomplete } from './autocomplete/useMentionAutocomplete.ts'
import { ChatInputClusterSelect } from './ChatInputClusterSelect.tsx'
import { ChatInputIconFrame } from './ChatInputIconFrame.tsx'
import { ChatInputRuntimeSelect } from './ChatInputRuntimeSelect.tsx'

export function ChatInput({
  currentThread,
  sendMessage,
  serverNames,
  enableExamplePrompts = true,
  showPrompts,
  setShowPrompts,
  placeholder = 'Start typing...',
  onValueChange,
  stateless = false,
  ...props
}: {
  currentThread?: Nullable<ChatThreadDetailsFragment>
  sendMessage: (newMessage: string) => void
  serverNames?: string[]
  enableExamplePrompts?: boolean
  showPrompts?: boolean
  setShowPrompts?: Dispatch<SetStateAction<boolean>>
  placeholder?: string
  onValueChange?: Dispatch<string>
  stateless?: boolean
} & Partial<Omit<ComponentPropsWithoutRef<typeof EditableDiv>, 'onEnter'>>) {
  const { mcpPanelOpen, setMcpPanelOpen } = useChatbot()

  const [localMessage, setLocalMessage] = useState<string>('')
  const [persistedMessage, setPersistedMessage] =
    usePersistedSessionState<string>('currentAiChatMessage', '')

  const newMessage = stateless ? localMessage : persistedMessage
  const setNewMessage = stateless ? setLocalMessage : setPersistedMessage

  const inputRef = useAutofocusRef<ChatInputSimpleRef>()

  const handleSubmit = () => {
    const content = newMessage.trim()
    if (!content) return
    sendMessage(content)
    inputRef.current?.resetInput()
  }

  return (
    <ChatInputContainerSC className="plrl-chat-input-form">
      {serverNames && serverNames.length > 0 && (
        <Flex
          justify="space-between"
          align="center"
          gap="small"
        >
          <ChipListSC>
            {serverNames.slice(0, 4).map((serverName) => (
              <Chip
                key={serverName}
                size="small"
                css={{ minWidth: 'fit-content' }}
              >
                {truncate(serverName, { length: 14 })}
              </Chip>
            ))}
            {serverNames.length > 4 && (
              <Chip size="small">+{serverNames.length - 4}</Chip>
            )}
          </ChipListSC>
        </Flex>
      )}
      <ChatInputSimple
        bgColor="fill-zero"
        wrapperStyles={{ minHeight: 'unset' }}
        css={{ maxHeight: 130 }}
        {...props}
        placeholder={placeholder}
        setValue={(value) => {
          setNewMessage(value)
          onValueChange?.(value)
        }}
        initialValue={newMessage}
        onSubmit={handleSubmit}
        allowSubmit={!!newMessage.trim()}
        options={
          <Flex
            gap="xxsmall"
            align="flex-end"
            overflow="hidden"
          >
            {enableExamplePrompts && (
              <ChatInputIconFrame
                active={showPrompts}
                icon={<AiSparkleFilledIcon />}
                tooltip={`${showPrompts ? 'Hide' : 'Show'} example prompts`}
                onClick={() => setShowPrompts?.(!showPrompts)}
              />
            )}
            {!isEmpty(serverNames) && (
              <ChatInputIconFrame
                icon={<ServersIcon />}
                tooltip={`${mcpPanelOpen ? 'Collapse' : 'Expand'} MCP servers`}
                onClick={() => setMcpPanelOpen(!mcpPanelOpen)}
              />
            )}
            {!!currentThread?.session?.id && (
              <ChatInputRuntimeSelect currentThread={currentThread} />
            )}
            {!!currentThread?.session?.id && (
              <ChatInputClusterSelect currentThread={currentThread} />
            )}
          </Flex>
        }
        ref={inputRef}
      />
    </ChatInputContainerSC>
  )
}

export type ChatInputSimpleRef = { resetInput: () => void } & HTMLElement

export function ChatInputSimple({
  ref,
  onSubmit,
  allowSubmit = true,
  loading = false,
  disabled = false,
  bgColor = 'fill-zero-selected',
  options,
  wrapperStyles,
  enableAutoComplete = false,
  workbenchId,
  onKeyDown: onKeyDownProp,
  setValue: setValueProp,
  ...props
}: {
  ref?: RefObject<Nullable<ChatInputSimpleRef>>
  onSubmit: () => void
  allowSubmit?: boolean
  loading?: boolean
  bgColor?: SemanticColorKey
  options?: ReactNode
  wrapperStyles?: StyledObject
  enableAutoComplete?: boolean
  workbenchId?: Nullable<string>
} & Omit<ComponentPropsWithoutRef<typeof EditableDiv>, 'onEnter'>) {
  const { spacing } = useTheme()
  const divRef = useRef<HTMLDivElement>(null)
  const handleSubmit = () => allowSubmit && onSubmit()

  const autocomplete = useMentionAutocomplete({
    containerRef: divRef,
    workbenchId,
    enabled: enableAutoComplete,
  })

  useImperativeHandle(ref, () => {
    const node = divRef.current
    if (node)
      return Object.assign(node, {
        resetInput: () => {
          node.innerHTML = ''
          // notify React state so callers don't have to also reset state locally
          node.dispatchEvent(new InputEvent('input', { bubbles: true }))
        },
      })
  })

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (autocomplete.onKeyDown(e)) return
      onKeyDownProp?.(e)
    },
    [autocomplete, onKeyDownProp]
  )

  return (
    <EditableContentWrapperSC
      $bgColor={bgColor}
      css={{ position: 'relative', minHeight: 130, ...wrapperStyles }}
    >
      <EditableDiv
        ref={divRef}
        {...props}
        onEnter={handleSubmit}
        onKeyDown={onKeyDown}
        setValue={(value) => {
          setValueProp(value)
          autocomplete.onInput()
        }}
        disabled={loading || disabled}
      />
      <div css={{ width: '100%', paddingRight: spacing.xlarge }}>{options}</div>
      <ChatSubmitButton
        loading={loading}
        loadingIndicator={<SpinnerAlt color="icon-xlight" />}
        disabled={!allowSubmit || loading || disabled}
        onClick={handleSubmit}
        css={{
          position: 'absolute',
          bottom: spacing.small,
          right: spacing.small,
        }}
      />
      <MentionMenu
        autoCompleteState={autocomplete.state}
        onSelect={autocomplete.commit}
        onHover={autocomplete.setHighlightedIndex}
      />
    </EditableContentWrapperSC>
  )
}

export function ChatSubmitButton({
  bgColor = 'fill-primary',
  ...props
}: { bgColor?: SemanticColorKey } & Omit<
  ComponentPropsWithRef<typeof ChatSubmitButtonSC>,
  'children' | '$bgColor'
>) {
  return (
    <ChatSubmitButtonSC
      $bgColor={bgColor}
      {...props}
    >
      <ArrowUpIcon />
    </ChatSubmitButtonSC>
  )
}

export function ChatOptionPill({
  isOpen = false,
  textType = 'caption',
  children,
  ...props
}: { textType?: SemanticPartialType } & ComponentPropsWithRef<typeof Chip>) {
  const { partials, colors } = useTheme()
  return (
    <Chip
      clickable
      fillLevel={2}
      size="large"
      css={{ borderRadius: 12 }}
      {...props}
    >
      <Flex
        align="center"
        gap="xsmall"
        css={{ ...partials.text[textType], color: colors['text-xlight'] }}
      >
        {children}
        <CaretDownIcon
          size={10}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out',
          }}
        />
      </Flex>
    </Chip>
  )
}

const ChatInputContainerSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  position: 'relative',
  padding: theme.spacing.medium,
}))

const EditableContentWrapperSC = styled.div<{
  $bgColor: SemanticColorKey
}>(({ theme, $bgColor }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors[$bgColor],
  border: theme.borders.input,
  outline: '1px solid transparent',

  '&:has(div:focus)': {
    backgroundColor: theme.colors['fill-zero-selected'],
    transition: 'box-shadow 0.16s ease-in-out, border 0.16s ease-in-out',
    border: theme.borders['outline-focused'],
  },
}))

const ChatSubmitButtonSC = styled(Button)<{ $bgColor: SemanticColorKey }>(
  ({ theme, $bgColor }) => ({
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    width: 28,
    minHeight: 0,
    borderRadius: 25,
    background: theme.colors[$bgColor],
  })
)

const ChipListSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xsmall,
  maxWidth: 256,
  minWidth: 0,
}))
