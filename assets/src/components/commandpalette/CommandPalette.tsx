import {
  ArrowLeftIcon,
  CommandIcon,
  Input,
  ReturnIcon,
  useResizeObserver,
} from '@pluralsh/design-system'
import { Command } from 'cmdk'
import { isEmpty } from 'lodash'
import {
  Dispatch,
  KeyboardEvent,
  ReactElement,
  SetStateAction,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { VariableSizeList } from 'react-window'
import { useTheme } from 'styled-components'
import {
  ChatThreadTinyFragment,
  PageInfoFragment,
} from '../../generated/graphql.ts'
import { fromNow } from '../../utils/datetime.ts'
import { useChatbot } from '../ai/AIContext.tsx'
import { AITableActions } from '../ai/AITableActions.tsx'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../ai/AITableEntry.tsx'
import { ChatInput } from '../ai/chatbot/input/ChatInput.tsx'
import { useAIEnabled } from '../contexts/DeploymentSettingsContext.tsx'
import usePersistedSessionState from '../hooks/usePersistedSessionState.tsx'
import { ButtonGroup } from '../utils/ButtonGroup.tsx'
import LoadingIndicator from '../utils/LoadingIndicator.tsx'
import { StandardScroller } from '../utils/SmoothScroller.tsx'
import { Body1BoldP, CaptionP } from '../utils/typography/Text.tsx'
import {
  CommandPaletteContext,
  CommandPaletteTab,
} from './CommandPaletteContext.tsx'
import CommandPaletteShortcuts from './CommandPaletteShortcuts'

import { CommandGroup, useCommands, useHistory } from './commands.ts'

export default function CommandPalette() {
  const aiEnabled = useAIEnabled()
  const theme = useTheme()
  const { setCmdkOpen, initialTab, setInitialTab } = use(CommandPaletteContext)
  const [value, setValue] = useState('')
  // only show hidden commands if the user has typed something
  const commands = useCommands({ showHidden: value.length > 0, filter: value })
  const [tab, setTabState] = useState<CommandPaletteTab>(initialTab)
  // helps persist tab state while still allowing override to launch a specific tab
  const setTab = useCallback(
    (tab: CommandPaletteTab) => {
      setTabState(tab)
      setInitialTab(tab)
    },
    [setInitialTab]
  )

  const { loading, history, fetchNextPage, pageInfo } = useHistory({
    skip: tab !== CommandPaletteTab.History,
    filter: value,
    component: (thread) => (
      <HistoryItem
        key={thread.id}
        thread={thread as ChatThreadTinyFragment}
        css={{
          backgroundColor: theme.colors['fill-zero'],
        }}
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

  const items: Array<CommandGroup> = useMemo(() => {
    switch (tab) {
      case CommandPaletteTab.History:
        return history
      case CommandPaletteTab.Commands:
        return commands
      default:
        return commands
    }
  }, [commands, history, tab])

  const hasItems =
    items.length > 0 && items.some((item) => item.commands?.length > 0)

  const showEmptyState = useMemo(
    () => !loading && !hasItems,
    [hasItems, loading]
  )

  return (
    <>
      <div id="cmdk-input-wrapper">
        <CommandAdvancedInput
          placeholder={
            aiEnabled
              ? 'Search history, commands, or ask Plural AI a question...'
              : 'Search commands...'
          }
          onValueChange={setValue}
          value={value}
          setCmdkOpen={setCmdkOpen}
          aiEnabled={aiEnabled}
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
      <Command.List
        className={
          tab === CommandPaletteTab.History ? 'cmdk-history' : 'cmdk-commands'
        }
      >
        {loading && !hasItems && <LoadingIndicator />}
        {showEmptyState && (
          <div
            css={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xxsmall,
              height: '100%',
              justifyContent: 'center',
              padding: theme.spacing.xlarge,
            }}
          >
            <Body1BoldP>No results found.</Body1BoldP>
            <p
              css={{
                color: theme.colors['text-xlight'],
                maxWidth: 480,
                textAlign: 'center',
              }}
            >
              Could not find any results matching: {value}
            </p>
          </div>
        )}
        {tab === CommandPaletteTab.History && (
          <CommandPaletteHistory
            items={items}
            loading={loading}
            setCmdkOpen={setCmdkOpen}
            pageInfo={pageInfo}
            fetchNextPage={fetchNextPage}
          />
        )}
        {tab === CommandPaletteTab.Commands && (
          <CommandPaletteCommands
            items={items}
            setCmdkOpen={setCmdkOpen}
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

interface CommandPaletteHistoryProps {
  items: Array<CommandGroup>
  loading: boolean
  pageInfo: PageInfoFragment
  fetchNextPage: Dispatch<void>
  setCmdkOpen: Dispatch<SetStateAction<boolean>>
  modalReady?: boolean
}

function CommandPaletteHistory({
  items,
  loading,
  pageInfo,
  fetchNextPage,
  setCmdkOpen,
}: CommandPaletteHistoryProps): ReactElement {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(0)
  const [width, setWidth] = useState(0)

  const [listRef, setListRef] = useState<VariableSizeList | null>(null)
  const commands = useMemo(() => items.flatMap((i) => i.commands), [items])
  const theme = useTheme()

  useResizeObserver(wrapperRef, (entry) => {
    setHeight(entry.height)
    setWidth(entry.width)
  })

  return (
    <>
      <div
        ref={wrapperRef}
        css={{ minHeight: 500 }}
      >
        <StandardScroller
          customHeight={height}
          customWidth={width}
          listRef={listRef}
          setListRef={setListRef}
          items={commands}
          loading={loading}
          placeholder={() => <div style={{ height: 50 }}></div>}
          hasNextPage={pageInfo?.hasNextPage}
          mapper={(command, { prev }, { index: idx }) => {
            return (
              <div
                key={`${command?.prefix}${command?.label}${idx}`}
                css={{
                  ...(isEmpty(prev) ? { marginTop: theme.spacing.small } : {}),
                }}
              >
                <Command.Item
                  className="cmdk-history-item"
                  tabIndex={0}
                  key={`${command?.prefix}${command?.label}${idx}`}
                  value={`${command?.prefix}${command?.label}${idx}`}
                  disabled={command?.disabled}
                  onSelect={() => {
                    command.callback()
                    setCmdkOpen(false)
                  }}
                >
                  {command?.component ? command?.component : null}
                </Command.Item>
              </div>
            )
          }}
          loadNextPage={fetchNextPage}
          handleScroll={undefined}
          refreshKey={undefined}
          setLoader={undefined}
        />
      </div>
    </>
  )
}

interface CommandPaletteCommandsProps {
  items: Array<CommandGroup>
  setCmdkOpen: Dispatch<SetStateAction<boolean>>
}

function CommandPaletteCommands({
  items,
  setCmdkOpen,
}: CommandPaletteCommandsProps): Array<ReactElement> {
  return items?.map((group, i) => (
    <div key={i}>
      <Command.Group title={group.title}>
        {group.commands.map((command, idx) => (
          <Command.Item
            tabIndex={0}
            key={`${command.prefix}${command.label}${idx}`}
            value={`${command.prefix}${command.label}${idx}`}
            disabled={command.disabled}
            onSelect={() => {
              command.callback()
              setCmdkOpen(false)
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
      {i < (items?.filter((item) => item.commands?.length > 0)).length - 1 && (
        <Command.Separator />
      )}
    </div>
  ))
}

interface CommandAdvancedInputProps {
  placeholder: string
  value: string
  onValueChange: Dispatch<SetStateAction<string>>
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  setCmdkOpen?: Dispatch<SetStateAction<boolean>>
  aiEnabled?: Nullable<boolean>
}

function CommandAdvancedInput({
  placeholder,
  onValueChange,
  value,
  onKeyDown,
  setCmdkOpen,
  aiEnabled,
  ...props
}: CommandAdvancedInputProps): ReactElement {
  const { createNewThread } = useChatbot()
  const { setMessage: setPendingMessage } = useCommandPaletteMessage()

  const sendMessage = useCallback(
    (message: string) => {
      createNewThread({
        summary: 'New Chat with Plural AI',
      }).then(() => {
        setPendingMessage(message)
        setCmdkOpen?.(false)
      })
    },
    [createNewThread, setPendingMessage, setCmdkOpen]
  )

  return aiEnabled ? (
    <ChatInput
      enableExamplePrompts={false}
      onKeyDown={onKeyDown}
      sendMessage={sendMessage}
      placeholder={placeholder}
      onValueChange={onValueChange}
      stateless={true}
      {...props}
    />
  ) : (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}

interface HistoryItemProps {
  thread: ChatThreadTinyFragment
}

function HistoryItem({ thread }: HistoryItemProps): ReactElement {
  const timestamp = getThreadOrPinTimestamp(thread)

  const insight = thread.insight

  return (
    <>
      <AIEntryLabel
        isStale={false}
        thread={thread}
        insight={insight}
      />
      <CaptionP css={{ flexShrink: 0 }}>{fromNow(timestamp)}</CaptionP>
      <AITableActions thread={thread} />
    </>
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
