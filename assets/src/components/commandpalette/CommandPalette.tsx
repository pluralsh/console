import { Command, useCommandState } from 'cmdk'
import { useTheme } from 'styled-components'
import { Dispatch, SetStateAction, useCallback } from 'react'
import { ReloadIcon } from '@pluralsh/design-system'

import { useCommands } from './commands'
import CommandPaletteShortcuts from './CommandPaletteShortcuts'

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
  const commands = useCommands({ showHidden: value.length > 0 })
  const isEmpty = useCommandState((state) => state.filtered.count === 0)
  const reset = useCallback(() => setValue(''), [setValue])

  return (
    <>
      <Command.Input
        placeholder="Type a command or search..."
        value={value}
        onValueChange={setValue}
        onKeyDown={(event) => {
          if (isEmpty && event.key === 'Enter') reset()
        }}
      />
      <Command.List>
        <Command.Empty onClick={reset}>
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
        </Command.Empty>
        {commands.map((group, i) => (
          <div key={i}>
            <Command.Group title={group.title}>
              {group.commands.map((command) => (
                <Command.Item
                  key={`${command.prefix}${command.label}`}
                  disabled={command.disabled}
                  onSelect={() => {
                    command.callback()
                    close()
                  }}
                >
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
                </Command.Item>
              ))}
            </Command.Group>
            {i < commands.length - 1 && <Command.Separator />}
          </div>
        ))}
      </Command.List>
    </>
  )
}
