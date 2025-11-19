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
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { ChatThreadTinyFragment } from '../../generated/graphql.ts'
import { fromNow } from '../../utils/datetime.ts'
import { useChatbot } from '../ai/AIContext.tsx'
import { AITableActions } from '../ai/AITableActions.tsx'
import { AIEntryLabel, getThreadTimestamp } from '../ai/AITableEntry.tsx'
import { ChatInput } from '../ai/chatbot/input/ChatInput.tsx'
import { useAIEnabled } from '../contexts/DeploymentSettingsContext.tsx'
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
          path: CommandPaletteTab.Threads,
          label: CommandPaletteTab.Threads,
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
        tab === CommandPaletteTab.Threads &&
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
          numItems={
            tab === CommandPaletteTab.Threads ? history.length : commands.length
          }
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
        {tab === CommandPaletteTab.Threads && (
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
  onCmdKClose,
  numItems,
}: {
  curTab: CommandPaletteTab
  cmdValue: string
  onCmdValueChange: Dispatch<SetStateAction<string>>
  onHistoryValueChange: Dispatch<SetStateAction<string>>
  onCmdKClose?: () => void
  numItems: number
}) {
  const { colors, borderRadiuses } = useTheme()
  const { createNewThread } = useChatbot()

  const sendMessage = useCallback(
    (message: string) => {
      createNewThread({ summary: 'New Chat with Plural AI' }, message)
      onCmdKClose?.()
    },
    [createNewThread, onCmdKClose]
  )

  // setting focus on the parent wrapper here makes hitting enter go to the highlighted thread instead of sending a new chat message
  // hard to strike exactly the right balance here but this works pretty well
  const onChatKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowDown' && numItems > 0) {
        const parentWrapper = e.currentTarget.closest('[cmdk-root]')
        if (parentWrapper instanceof HTMLElement) parentWrapper.focus()
      }
    },
    [numItems]
  )

  return curTab === CommandPaletteTab.Threads ? (
    <ChatInput
      stateless
      enableExamplePrompts={false}
      onKeyDown={onChatKeyDown}
      sendMessage={sendMessage}
      placeholder="Search history or ask Plural AI a question..."
      onValueChange={onHistoryValueChange}
    />
  ) : (
    <Input
      placeholder="Search commands..."
      value={cmdValue}
      onChange={(e) => onCmdValueChange(e.target.value)}
      css={{
        background: colors['fill-zero'],
        borderRadius: borderRadiuses.large,
      }}
    />
  )
}

function HistoryItem({ thread }: { thread: ChatThreadTinyFragment }) {
  const { currentThreadId } = useChatbot()

  return (
    <Flex
      width="100%"
      alignItems="center"
      gap="small"
    >
      <AIEntryLabel
        isStale={false}
        thread={thread}
      />
      {thread.id === currentThreadId && <Chip severity="info">Selected</Chip>}
      <CaptionP css={{ flexShrink: 0 }}>
        {fromNow(getThreadTimestamp(thread))}
      </CaptionP>
      <AITableActions thread={thread} />
    </Flex>
  )
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
