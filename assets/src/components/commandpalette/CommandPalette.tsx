import {
  ArrowLeftIcon,
  Chip,
  CommandIcon,
  Flex,
  Input,
  ReturnIcon,
} from '@pluralsh/design-system'
import {
  Dispatch,
  KeyboardEvent,
  SetStateAction,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { ChatThreadTinyFragment } from '../../generated/graphql.ts'
import { fromNow } from '../../utils/datetime.ts'
import { useChatbot } from '../ai/AIContext.tsx'
import { AITableActions } from '../ai/AITableActions.tsx'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../ai/AITableEntry.tsx'
import { ChatInput } from '../ai/chatbot/input/ChatInput.tsx'
import { useAIEnabled } from '../contexts/DeploymentSettingsContext.tsx'
import usePersistedSessionState from '../hooks/usePersistedSessionState.tsx'
import { ButtonGroup } from '../utils/ButtonGroup.tsx'
import { Body1BoldP, Body2P, CaptionP } from '../utils/typography/Text.tsx'
import {
  CommandPaletteContext,
  CommandPaletteTab,
} from './CommandPaletteContext.tsx'
import CommandPaletteShortcuts from './CommandPaletteShortcuts'

import { Command } from 'cmdk'
import { TableSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { isEmpty } from 'lodash'
import {
  type Command as CommandT,
  CommandGroup,
  useCommands,
  useHistory,
} from './commands.ts'

export default function CommandPalette() {
  const aiEnabled = useAIEnabled()
  const theme = useTheme()
  const { setCmdkOpen, initialTab } = use(CommandPaletteContext)
  const onCmdKClose = () => setCmdkOpen(false)

  const [tab, setTab] = useState<CommandPaletteTab>(initialTab)
  const [cmdValue, setCmdValue] = useState('')
  const [historyValue, setHistoryValue] = useState('')

  // only show hidden commands if the user has typed something
  const commands = useCommands({
    showHidden: cmdValue.length > 0,
    filter: cmdValue,
  })

  const { loading, history, fetchNextPage, pageInfo } = useHistory({
    filter: historyValue,
    component: (thread) => (
      <HistoryItem
        key={thread.id}
        thread={thread as ChatThreadTinyFragment}
      />
    ),
  })

  const directory = useMemo(
    () =>
      [
        {
          path: CommandPaletteTab.History,
          label: CommandPaletteTab.History,
          enabled: aiEnabled ?? false,
        },
        {
          path: CommandPaletteTab.Commands,
          icon: <CommandIcon />,
          label: CommandPaletteTab.Commands,
          enabled: true,
        },
      ].filter((d) => d.enabled),
    [aiEnabled]
  )

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const isNearBottom =
        e.currentTarget.scrollTop + e.currentTarget.clientHeight >=
        e.currentTarget.scrollHeight - 100
      if (
        isNearBottom &&
        tab === CommandPaletteTab.History &&
        pageInfo?.hasNextPage
      ) {
        fetchNextPage()
      }
    },
    [fetchNextPage, pageInfo?.hasNextPage, tab]
  )

  return (
    <>
      <div id="cmdk-input-wrapper">
        <CommandAdvancedInput
          curTab={tab}
          cmdValue={cmdValue}
          onCmdValueChange={setCmdValue}
          onHistoryValueChange={setHistoryValue}
          onCmdKClose={onCmdKClose}
        />
        {directory.length > 1 && (
          <div id="cmdk-input-tabs">
            <ButtonGroup
              directory={directory}
              tab={tab}
              onClick={(t) => setTab(t)}
            />
          </div>
        )}
      </div>
      <Command.List onScroll={onScroll}>
        {tab === CommandPaletteTab.History && (
          <CommandPaletteHistory
            history={history}
            loading={loading}
            value={historyValue}
          />
        )}
        {tab === CommandPaletteTab.Commands && (
          <CommandPaletteCommands
            value={cmdValue}
            items={commands}
            onCmdKClose={onCmdKClose}
          />
        )}
      </Command.List>
      <div id="cmdk-footer">
        <div>
          <ArrowLeftIcon
            color={theme.colors['icon-disabled']}
            size={12}
            css={{ rotate: '90deg' }}
          />
          <ArrowLeftIcon
            color={theme.colors['icon-disabled']}
            size={12}
            css={{ rotate: '-90deg' }}
          />
          <span>to navigate</span>
        </div>
        <div css={{ flex: 1 }} />
        <div>
          <ReturnIcon
            color={theme.colors['icon-disabled']}
            css={{ transform: 'scale(1, -1)' }}
          />
          <span>to select</span>
        </div>
      </div>
    </>
  )
}

function CommandPaletteHistory({
  history,
  loading,
  value,
}: {
  history: CommandT[]
  loading: boolean
  value: string
}) {
  const { setCmdkOpen } = use(CommandPaletteContext)

  if (loading)
    return (
      <TableSkeleton
        centered
        numColumns={1}
        height={400}
        width={750}
      />
    )
  if (isEmpty(history)) return <CommandEmptyState value={value} />

  return history.map((command) => (
    <Command.Item
      key={command.id}
      className="cmdk-history-item"
      tabIndex={0}
      value={`${command.prefix}${command.label}-${command.id}`}
      onSelect={() => {
        command.callback()
        setCmdkOpen(false)
      }}
    >
      {command?.component ? command?.component : null}
    </Command.Item>
  ))
}

function CommandPaletteCommands({
  value,
  items,
  onCmdKClose,
}: {
  value: string
  items: Array<CommandGroup>
  onCmdKClose: () => void
}) {
  const hasItems = items.some((group) => !isEmpty(group.commands))

  return !hasItems ? (
    <CommandEmptyState value={value} />
  ) : (
    items.map((group, i) => (
      <div key={i}>
        <Command.Group>
          {group.commands.map((command, idx) => (
            <Command.Item
              tabIndex={0}
              key={`${command.prefix}${command.label}${idx}`}
              value={`${command.prefix}${command.label}${idx}`}
              disabled={command.disabled}
              onSelect={() => {
                command.callback()
                onCmdKClose()
              }}
            >
              {command.component ? (
                command.component
              ) : (
                <>
                  <command.icon marginRight="xsmall" />
                  <span className="fade">{command.prefix}</span>
                  <span>{command.label}</span>
                  {command.rightIcon && (
                    <command.rightIcon
                      size={12}
                      marginLeft="xxsmall"
                    />
                  )}
                  <div css={{ flex: 1 }} />
                  <CommandPaletteShortcuts shortcuts={command.hotkeys} />
                </>
              )}
            </Command.Item>
          ))}
        </Command.Group>
        {i <
          (items?.filter((item) => item.commands?.length > 0)).length - 1 && (
          <Command.Separator />
        )}
      </div>
    ))
  )
}

function CommandAdvancedInput({
  curTab,
  cmdValue,
  onCmdValueChange,
  onHistoryValueChange,
  onKeyDown,
  onCmdKClose,
  ...props
}: {
  curTab: CommandPaletteTab
  cmdValue: string
  onCmdValueChange: Dispatch<SetStateAction<string>>
  onHistoryValueChange: Dispatch<SetStateAction<string>>
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  onCmdKClose?: () => void
}) {
  const { createNewThread } = useChatbot()
  const { setMessage: setPendingMessage } = useCommandPaletteMessage()

  const sendMessage = useCallback(
    (message: string) => {
      createNewThread({
        summary: 'New Chat with Plural AI',
      }).then(() => {
        setPendingMessage(message)
        onCmdKClose?.()
      })
    },
    [createNewThread, setPendingMessage, onCmdKClose]
  )

  return curTab === CommandPaletteTab.History ? (
    <ChatInput
      enableExamplePrompts={false}
      onKeyDown={onKeyDown}
      sendMessage={sendMessage}
      placeholder="Search history or ask Plural AI a question..."
      onValueChange={onHistoryValueChange}
      stateless={true}
      {...props}
    />
  ) : (
    <Input
      placeholder="Search commands..."
      value={cmdValue}
      onChange={(e) => onCmdValueChange(e.target.value)}
      onKeyDown={onKeyDown}
      {...props}
    />
  )
}

function HistoryItem({ thread }: { thread: ChatThreadTinyFragment }) {
  const { currentThreadId } = useChatbot()
  const timestamp = getThreadOrPinTimestamp(thread)

  const insight = thread.insight

  return (
    <Flex
      width="100%"
      alignItems="center"
      gap="small"
    >
      <AIEntryLabel
        isStale={false}
        thread={thread}
        insight={insight}
      />
      {thread.id === currentThreadId && <Chip severity="info">Selected</Chip>}
      <CaptionP css={{ flexShrink: 0 }}>{fromNow(timestamp)}</CaptionP>
      <AITableActions thread={thread} />
    </Flex>
  )
}

export const useCommandPaletteMessage = () => {
  const [message, setMessage] = usePersistedSessionState(
    'commandPalettePendingChatMessage',
    ''
  )
  const processedRef = useRef<string>('')

  const readValue = useCallback(() => {
    if (!message || processedRef.current === message) {
      return ''
    }

    processedRef.current = message
    setMessage('')
    return message
  }, [message, setMessage])

  return { readValue, setMessage }
}

const CommandEmptyState = ({ value }: { value: string }) => {
  return (
    <Flex
      direction="column"
      gap="xxsmall"
      padding="xlarge"
      align="center"
      textAlign="center"
    >
      <Body1BoldP>No results found.</Body1BoldP>
      <Body2P
        $color="text-xlight"
        css={{ maxWidth: 480, wordBreak: 'break-word' }}
      >
        Could not find any results matching: {value}
      </Body2P>
    </Flex>
  )
}
