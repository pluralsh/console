import {
  ArrowLeftIcon,
  Button,
  CommandIcon,
  ReloadIcon,
  ReturnIcon,
} from '@pluralsh/design-system'
import { Command, useCommandState } from 'cmdk'
import {
  Dispatch,
  KeyboardEvent,
  ReactElement,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { ChatThreadTinyFragment } from '../../generated/graphql.ts'
import { fromNow } from '../../utils/datetime.ts'
import { AITableActions } from '../ai/AITableActions.tsx'
import { AIEntryLabel, getThreadOrPinTimestamp } from '../ai/AITableEntry.tsx'
import { ButtonGroup } from '../utils/ButtonGroup.tsx'
import { CaptionP } from '../utils/typography/Text.tsx'
import CommandPaletteShortcuts from './CommandPaletteShortcuts'

import { CommandGroup, useCommands, useHistory } from './commands.ts'

enum CommandPaletteTab {
  History = 'History',
  Commands = 'Commands',
}

const directory = [
  { path: CommandPaletteTab.History, label: CommandPaletteTab.History },
  {
    path: CommandPaletteTab.Commands,
    icon: <CommandIcon />,
    label: CommandPaletteTab.Commands,
  },
]

const defaultTab = CommandPaletteTab.History

export default function CommandPalette({
  value,
  setValue,
  close,
}: {
  value: string
  setValue: Dispatch<SetStateAction<string>>
  close: () => void
}) {
  const theme = useTheme()
  // only show hidden commands if the user has typed something
  const commands = useCommands({ showHidden: value.length > 0, filter: value })
  const { history } = useHistory({
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
  const isEmpty = useCommandState((state) => state.filtered.count === 0)
  const reset = useCallback(() => setValue(''), [setValue])
  const [tab, setTab] = useState<CommandPaletteTab>(defaultTab)

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

  const showEmptyState = useMemo(() => {
    return (
      items.length === 0 || items.every((item) => item.commands?.length === 0)
    )
  }, [items])

  return (
    <>
      <div id="cmdk-input-wrapper">
        <CommandAdvancedInput
          placeholder="Search history, commands, or ask Copilot a question..."
          value={value}
          onValueChange={setValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault()
            if (isEmpty && event.key === 'Enter') reset()
          }}
        />
        <div id="cmdk-input-tabs">
          <ButtonGroup
            directory={directory}
            tab={tab}
            onClick={(t) => setTab(t)}
          />
        </div>
      </div>
      <Command.List>
        {showEmptyState && (
          <Button
            tertiary
            css={{
              width: '100%',
              justifyContent: 'left',
            }}
            onClick={reset}
          >
            <div
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xsmall,
              }}
            >
              <ReloadIcon marginRight="xsmall" />
              <span>Reset search</span>
              <span
                css={{
                  ...theme.partials.text.caption,
                  color: theme.colors['text-xlight'],
                }}
              >
                (No results found)
              </span>
            </div>
          </Button>
        )}
        {items?.map((group, i) => (
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
                    close()
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
              (items?.filter((item) => item.commands?.length > 0)).length -
                1 && <Command.Separator />}
          </div>
        ))}
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

interface CommandAdvancedInputProps {
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

// TODO: replace this with chat input component
function CommandAdvancedInput({
  placeholder,
  value,
  onValueChange,
  onKeyDown,
  ...props
}: CommandAdvancedInputProps): ReactElement {
  return (
    <input
      id="cmdk-input"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={onKeyDown}
      {...props}
    />
  )
}

interface HistoryItemProps {
  thread: ChatThreadTinyFragment
}

// TODO: add support for onClick to navigate to the thread
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
